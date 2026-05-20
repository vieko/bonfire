/**
 * Pi adapter for Bonfire.
 *
 * Hooks Pi's session_compact event and updates two managed fence blocks in
 * <git-root>/.bonfire/index.md:
 *
 *   1. <!-- bonfire:auto-inflight:start v1 --> ... <!-- bonfire:auto-inflight:end -->
 *      Replaced on every compaction with the latest Goal / Next Steps /
 *      In Progress / Blocked extracted from Pi's structured summary.
 *
 *   2. <!-- bonfire:auto-sessions:start v1 --> ... <!-- bonfire:auto-sessions:end -->
 *      Accumulates one row per compaction id (de-duped, cap 5 most recent).
 *
 * The adapter never modifies content outside these fences. Files without
 * fences are left untouched — users must add fences manually to opt in.
 * Bootstrap writes both fences when index.md is missing.
 *
 * Per-repo opt-out: .bonfire/config.json with { "auto": false }.
 */

import type { ExtensionAPI, ExtensionContext, SessionCompactEvent } from "@earendil-works/pi-coding-agent";
import { execSync } from "node:child_process";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import {
	bootstrapTemplate,
	extractFenceContent,
	extractFirstUserPrompt,
	extractOneLiner,
	findRowForKey,
	shortenSessionId,
	INFLIGHT_END,
	INFLIGHT_START,
	isGarbageSummary,
	renderFallbackInflight,
	renderInflight,
	replaceFence,
	truncate,
	upsertSessionRow,
} from "./lib";

const HOST = "pi";

export default function (pi: ExtensionAPI) {
	// Indicate bonfire is active in opted-in repos. Silent in repos without
	// .bonfire/ so the adapter stays invisible there. The compaction handler
	// overwrites this status with the action result when it fires.
	pi.on("session_start", async (_event, ctx) => {
		if (!ctx.hasUI) return;
		const gitRoot = findGitRoot(ctx.cwd);
		if (!gitRoot) return;
		try {
			const stat = await fs.stat(path.join(gitRoot, ".bonfire"));
			if (!stat.isDirectory()) return;
		} catch {
			return;
		}
		ctx.ui.setStatus("bonfire", ctx.ui.theme.fg("dim", "bonfire: tracking"));
	});

	pi.on("session_compact", async (event, ctx) => {
		try {
			await updateBonfireIndex(event, ctx);
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			ctx.ui.notify(`bonfire: ${msg}`, "warning");
		}
	});

	// Fallback path: when the session ends, if no compaction produced a usable
	// row (either none fired, or Pi's compaction returned garbage), use the
	// first user prompt + branch + uncommitted-file list to write a row.
	// This makes bonfire useful even when Pi's compaction pipeline is broken or
	// when sessions are too short to compact.
	pi.on("session_shutdown", async (_event, ctx) => {
		try {
			await maybeWriteFallback(ctx);
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			if (process.env.BONFIRE_DEBUG === "1") process.stderr.write(`bonfire fallback: ${msg}\n`);
		}
	});
}

interface BonfireConfig {
	auto?: boolean;
}

async function updateBonfireIndex(event: SessionCompactEvent, ctx: ExtensionContext): Promise<void> {
	const gitRoot = findGitRoot(ctx.cwd);
	if (!gitRoot) return;

	// Opt-in: only act when the user has created <git-root>/.bonfire/ themselves.
	// We never auto-create the directory; that would pollute every repo where Pi
	// happens to compact.
	const bonfireDir = path.join(gitRoot, ".bonfire");
	try {
		const stat = await fs.stat(bonfireDir);
		if (!stat.isDirectory()) return;
	} catch {
		return;
	}

	const config = await readConfig(gitRoot);
	if (config?.auto === false) return;

	const summary = event.compactionEntry.summary;

	// Skip writing when Pi's compaction returned garbage. The shutdown
	// handler will fill in a fallback row from the first user prompt instead.
	if (isGarbageSummary(summary)) return;

	const oneLiner = extractOneLiner(summary);
	if (!oneLiner) return;

	// Key rows by session id (not compaction entry id) so re-compactions of
	// the same session update the same row, and the shutdown fallback can
	// find/replace whatever this handler wrote.
	const sessionId = ctx.sessionManager.getSessionId();
	const shortId = shortenSessionId(sessionId);
	const branch = getGitBranch(gitRoot) ?? "(detached)";
	const date = new Date().toISOString().slice(0, 10);

	const indexPath = path.join(gitRoot, ".bonfire", "index.md");
	await ensureBonfireFile(indexPath, path.basename(gitRoot));

	const content = await fs.readFile(indexPath, "utf8");

	let next = content;
	let touchedInflight = false;
	let touchedSessions = false;

	const inflightMd = renderInflight(summary, { date, host: HOST, shortId, branch });
	if (inflightMd) {
		const updated = replaceFence(next, INFLIGHT_START, INFLIGHT_END, inflightMd);
		if (updated !== null) {
			next = updated;
			touchedInflight = true;
		}
	}

	const row = `- ${date} [${HOST}:${shortId}] ${branch} — ${oneLiner}`;
	const updatedSessions = upsertSessionRow(next, `[${HOST}:${shortId}]`, row);
	if (updatedSessions !== null) {
		next = updatedSessions;
		touchedSessions = true;
	}

	if (!touchedInflight && !touchedSessions) return;

	await atomicWrite(indexPath, next);

	const parts: string[] = [];
	if (touchedInflight) parts.push("in-flight");
	if (touchedSessions) parts.push("sessions");

	// Persistent footer status (themed, can't be missed) plus a brief
	// info-level notify (in case the user's terminal surfaces it).
	if (ctx.hasUI) {
		const label = `bonfire: ${parts.join(" + ")} • ${date}`;
		ctx.ui.setStatus("bonfire", ctx.ui.theme.fg("dim", label));
		ctx.ui.notify(`bonfire: ${parts.join(" + ")} updated`, "info");
	}
}

function findGitRoot(cwd: string): string | null {
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

function getGitBranch(cwd: string): string | null {
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

async function readConfig(gitRoot: string): Promise<BonfireConfig | null> {
	try {
		const raw = await fs.readFile(path.join(gitRoot, ".bonfire", "config.json"), "utf8");
		return JSON.parse(raw) as BonfireConfig;
	} catch {
		return null;
	}
}

/**
 * Caller has already verified <git-root>/.bonfire/ exists (the opt-in gate).
 * This only fills in index.md and .gitignore if missing.
 */
async function ensureBonfireFile(indexPath: string, repoName: string): Promise<void> {
	try {
		await fs.access(indexPath);
		return;
	} catch {
		// fall through to bootstrap
	}
	await fs.writeFile(indexPath, bootstrapTemplate(repoName), "utf8");

	const gitignorePath = path.join(path.dirname(indexPath), ".gitignore");
	try {
		await fs.access(gitignorePath);
	} catch {
		await fs.writeFile(gitignorePath, "*\n", "utf8");
	}
}

async function atomicWrite(targetPath: string, content: string): Promise<void> {
	const tmp = `${targetPath}.bonfire-tmp-${process.pid}`;
	await fs.writeFile(tmp, content, "utf8");
	await fs.rename(tmp, targetPath);
}

function getGitModifiedFiles(cwd: string): string[] {
	try {
		const out = execSync("git diff --name-only HEAD", {
			cwd,
			encoding: "utf8",
			stdio: ["ignore", "pipe", "ignore"],
		}).trim();
		if (!out) return [];
		return out.split("\n").filter(Boolean);
	} catch {
		return [];
	}
}

/**
 * Session-end fallback: write a row from the first user prompt when Pi's
 * compaction didn't produce something useful for this session.
 *
 * Conditions for writing:
 *   - .bonfire/ exists (opt-in gate)
 *   - config.json doesn't have { auto: false }
 *   - sessionManager has a valid sessionId
 *   - First user prompt is non-empty
 *   - Either no row exists for this session, or the existing row/in-flight
 *     is garbage (Pi compaction bug output).
 */
async function maybeWriteFallback(ctx: ExtensionContext): Promise<void> {
	const gitRoot = findGitRoot(ctx.cwd);
	if (!gitRoot) return;

	const bonfireDir = path.join(gitRoot, ".bonfire");
	try {
		const stat = await fs.stat(bonfireDir);
		if (!stat.isDirectory()) return;
	} catch {
		return;
	}

	const config = await readConfig(gitRoot);
	if (config?.auto === false) return;

	const sessionId = ctx.sessionManager.getSessionId();
	if (!sessionId) return;
	const shortId = shortenSessionId(sessionId);

	const indexPath = path.join(gitRoot, ".bonfire", "index.md");

	let content: string | null = null;
	try {
		content = await fs.readFile(indexPath, "utf8");
	} catch {
		// index.md doesn't exist yet; we'll bootstrap below if we have content worth writing
	}

	const existingRow = content ? findRowForKey(content, `[pi:${shortId}]`) : null;
	const existingInflight = content ? extractFenceContent(content, INFLIGHT_START, INFLIGHT_END) : null;

	const rowNeedsFallback = !existingRow || isGarbageSummary(existingRow);

	// In-flight needs the fallback when it's missing, garbage, or belongs to a
	// different session (stale — the current session is the user's actual
	// "current view" and should win, even if the prior session's content was
	// meaningful).
	const existingInflightSessionMatch = existingInflight?.match(/from\s+pi:([a-f0-9]+)/i);
	const existingInflightSessionId = existingInflightSessionMatch?.[1] ?? null;
	const inflightIsStale = existingInflight !== null && existingInflightSessionId !== shortId;
	const inflightNeedsFallback =
		!existingInflight || isGarbageSummary(existingInflight) || inflightIsStale;

	if (!rowNeedsFallback && !inflightNeedsFallback) return;

	const firstPrompt = extractFirstUserPrompt(ctx.sessionManager.getEntries());
	if (!firstPrompt) return;

	const branch = getGitBranch(gitRoot) ?? "(detached)";
	const modifiedFiles = getGitModifiedFiles(gitRoot);
	const date = new Date().toISOString().slice(0, 10);
	const oneLiner = truncate(firstPrompt, 200);
	const row = `- ${date} [pi:${shortId}] ${branch} — ${oneLiner}`;

	// Bootstrap if file is missing (first ever bonfire write for this repo).
	await ensureBonfireFile(indexPath, path.basename(gitRoot));
	if (content === null) content = await fs.readFile(indexPath, "utf8");

	let next = content;

	if (inflightNeedsFallback) {
		const inflightMd = renderFallbackInflight(
			firstPrompt,
			{ date, host: HOST, shortId, branch },
			modifiedFiles,
		);
		const updated = replaceFence(next, INFLIGHT_START, INFLIGHT_END, inflightMd);
		if (updated !== null) next = updated;
	}

	if (rowNeedsFallback) {
		const updated = upsertSessionRow(next, `[pi:${shortId}]`, row);
		if (updated !== null) next = updated;
	}

	if (next === content) return;
	await atomicWrite(indexPath, next);
}
