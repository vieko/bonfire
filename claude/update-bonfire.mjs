#!/usr/bin/env node
/**
 * Bonfire Claude Code Stop hook.
 *
 * Stdin: Claude Code hook input JSON. Expected fields:
 *   - session_id   (UUID)
 *   - cwd          (working directory)
 *   - hook_event_name ("Stop" — others are ignored)
 *
 * Behavior:
 *   1. Find git root from cwd. Skip if not a git repo.
 *   2. Honor `.bonfire/config.json` `{ "auto": false }` opt-out.
 *   3. Read the session's own JSONL transcript at
 *      ~/.claude/projects/<encoded-cwd>/<sessionId>.jsonl and walk it backwards
 *      to find the most recent `{type: "ai-title"}` entry. This replaces the
 *      legacy `sessions-index.json` source which Claude Code 2.x no longer
 *      maintains.
 *   4. Bootstrap <git-root>/.bonfire/index.md from template if missing.
 *   5. Update two fence blocks:
 *        <!-- bonfire:auto-inflight:start v1 --> ... end -->
 *          Replaced with a degraded in-flight (Claude only has a one-liner
 *          summary, not structured Goal/Next/Blocked).
 *        <!-- bonfire:auto-sessions:start v1 --> ... end -->
 *          Inserted/updated row keyed by [claude:<8charid>], cap 5 newest.
 *   6. Atomic write via tmpfile + rename. Skip when content is unchanged
 *      (so Stop firing every turn doesn't churn the file).
 *
 * Failure mode: prints a warning to stderr and exits 0. Stop hooks should
 * never break Claude Code's flow over a side-effect failure.
 *
 * No external deps. Node 18+ only (built-in fs/promises, child_process).
 */

import { execSync } from "node:child_process";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {
	INFLIGHT_START,
	INFLIGHT_END,
	SESSIONS_START,
	SESSIONS_END,
	ONE_LINER_MAX,
	replaceFence,
	shortenSessionId,
	truncate,
	upsertSessionRow,
} from "./lib.mjs";

// Adapter-local: this hook only ever writes `claude` rows. The shared
// fence-contract primitives live in ./lib.mjs (see AGENTS.md).
const HOST = "claude";

main().catch((err) => {
	process.stderr.write(`bonfire: ${err?.message || err}\n`);
	process.exit(0); // never block the hook
});

async function main() {
	const input = await readStdinJson();
	if (!input) return;

	if (input.hook_event_name && input.hook_event_name !== "Stop") return;

	const sessionId = input.session_id;
	let cwd = input.cwd;
	if (!sessionId || !cwd) return;

	// Claude Code encodes the *real* path (symlinks resolved) when building its
	// project directory under ~/.claude/projects/. On macOS, /var, /tmp, and
	// /etc are all symlinks under /private, so resolving cwd is mandatory or
	// the encoded lookup misses every time.
	try {
		cwd = await fs.realpath(cwd);
	} catch {
		// keep original cwd if realpath fails
	}

	const gitRoot = findGitRoot(cwd);
	if (!gitRoot) return;

	// Opt-in: only act when the user has created <git-root>/.bonfire/ themselves.
	// We never auto-create the directory; that would pollute every repo where
	// Claude Code happens to fire Stop.
	const bonfireDir = path.join(gitRoot, ".bonfire");
	try {
		const stat = await fs.stat(bonfireDir);
		if (!stat.isDirectory()) return;
	} catch {
		return;
	}

	const config = await readConfig(gitRoot);
	if (config?.auto === false) return;

	const aiTitle = await findLatestAiTitle(cwd, sessionId);
	if (!aiTitle) {
		debug(`no ai-title entry found in session jsonl for ${sessionId}`);
		return;
	}

	const summary = aiTitle.trim();
	if (!summary) {
		debug(`ai-title for session ${sessionId} is empty; skipping`);
		return;
	}

	const shortId = shortenSessionId(sessionId);
	const branch = getGitBranch(gitRoot) || "(detached)";
	const date = new Date().toISOString().slice(0, 10);

	const indexPath = path.join(gitRoot, ".bonfire", "index.md");
	await ensureBonfireFile(indexPath, path.basename(gitRoot));

	const content = await fs.readFile(indexPath, "utf8");
	let next = content;

	const inflightMd = renderInflight(summary, { date, host: HOST, shortId, branch });
	const updatedInflight = replaceFence(next, INFLIGHT_START, INFLIGHT_END, inflightMd);
	if (updatedInflight !== null) next = updatedInflight;

	const row = `- ${date} [${HOST}:${shortId}] ${branch} — ${truncate(summary, ONE_LINER_MAX)}`;
	const updatedSessions = upsertSessionRow(next, `[${HOST}:${shortId}]`, row);
	if (updatedSessions !== null) next = updatedSessions;

	if (next === content) return; // no change, skip write

	await atomicWrite(indexPath, next);
}

async function readStdinJson() {
	if (process.stdin.isTTY) return null;
	const chunks = [];
	for await (const chunk of process.stdin) chunks.push(chunk);
	const raw = Buffer.concat(chunks).toString("utf8").trim();
	if (!raw) return null;
	try {
		return JSON.parse(raw);
	} catch {
		return null;
	}
}

function findGitRoot(cwd) {
	try {
		return execSync("git rev-parse --show-toplevel", {
			cwd,
			encoding: "utf8",
			stdio: ["ignore", "pipe", "ignore"],
		}).trim();
	} catch {
		return null;
	}
}

function getGitBranch(cwd) {
	try {
		const branch = execSync("git rev-parse --abbrev-ref HEAD", {
			cwd,
			encoding: "utf8",
			stdio: ["ignore", "pipe", "ignore"],
		}).trim();
		return branch === "HEAD" ? null : branch;
	} catch {
		return null;
	}
}

async function readConfig(gitRoot) {
	try {
		const raw = await fs.readFile(path.join(gitRoot, ".bonfire", "config.json"), "utf8");
		return JSON.parse(raw);
	} catch {
		return null;
	}
}

/**
 * Claude Code encodes the *realpath* cwd by replacing each `/` and each `.`
 * with `-` (no collapsing of consecutive hyphens). Examples:
 *   /Users/vieko/.dotfiles                  -> -Users-vieko--dotfiles
 *   /private/var/folders/.../T/foo.bar      -> -private-var-folders-...-T-foo-bar
 * Caller must pass an already-realpath'd cwd.
 */
function encodeCwd(cwd) {
	return cwd.replace(/[/.]/g, "-");
}

/**
 * Read the session's JSONL transcript and return the aiTitle from the most
 * recent `{type: "ai-title"}` entry. Returns null when the file is missing
 * or contains no ai-title entries (sessions too short to be titled yet).
 *
 * Reads the whole file rather than seeking from the end; session JSONLs are
 * typically <1MB and titling entries are sparse.
 */
async function findLatestAiTitle(cwd, sessionId) {
	const encoded = encodeCwd(cwd);
	const jsonlPath = path.join(os.homedir(), ".claude", "projects", encoded, `${sessionId}.jsonl`);
	let content;
	try {
		content = await fs.readFile(jsonlPath, "utf8");
	} catch {
		return null;
	}
	const lines = content.split("\n");
	for (let i = lines.length - 1; i >= 0; i--) {
		const line = lines[i].trim();
		if (!line) continue;
		let entry;
		try {
			entry = JSON.parse(line);
		} catch {
			continue;
		}
		if (entry?.type === "ai-title" && entry.aiTitle) {
			return entry.aiTitle;
		}
	}
	return null;
}

/**
 * Claude's summary is a one-liner ("GTM Recon Agent: d0 timeout fix & logging"),
 * not a structured Goal/Next/Blocked doc. The in-flight block is therefore
 * a degraded version compared to Pi's. When Pi has touched the repo more
 * recently, Pi's richer content wins by virtue of being the last writer.
 */
function renderInflight(summary, meta) {
	const lines = [
		"",
		"## In flight",
		"",
		`_Updated ${meta.date} from ${meta.host}:${meta.shortId} on \`${meta.branch}\`_`,
		"",
		`Working on: ${truncate(summary, ONE_LINER_MAX)}`,
		"",
	];
	return lines.join("\n");
}

// Caller has verified <git-root>/.bonfire/ exists. We only fill in missing
// child files (index.md, .gitignore), never the directory itself.
async function ensureBonfireFile(indexPath, repoName) {
	try {
		await fs.access(indexPath);
		return;
	} catch {
		// fall through
	}

	const template = `# ${repoName}

${INFLIGHT_START}
## In flight

_No session has updated this repo yet. The bonfire adapter will populate this section after Claude Code Stop fires (every assistant turn) or Pi compacts (\`/compact\` or auto)._
${INFLIGHT_END}

${SESSIONS_START}
## Sessions
${SESSIONS_END}
`;
	await fs.writeFile(indexPath, template, "utf8");

	const gitignorePath = path.join(path.dirname(indexPath), ".gitignore");
	try {
		await fs.access(gitignorePath);
	} catch {
		await fs.writeFile(gitignorePath, "*\n", "utf8");
	}
}

async function atomicWrite(targetPath, content) {
	const tmp = `${targetPath}.bonfire-tmp-${process.pid}`;
	await fs.writeFile(tmp, content, "utf8");
	await fs.rename(tmp, targetPath);
}

/**
 * Diagnostic logging. Enabled by BONFIRE_DEBUG=1 in the environment, off by
 * default to keep Stop hook noise low.
 */
function debug(msg) {
	if (process.env.BONFIRE_DEBUG === "1" || process.env.BONFIRE_DEBUG === "true") {
		process.stderr.write(`bonfire: ${msg}\n`);
	}
}
