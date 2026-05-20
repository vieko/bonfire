/**
 * Smoke test for the Claude Code adapter. Builds a fake hook input + fake
 * sessions-index.json + sandbox git repo, runs update-bonfire.mjs, asserts
 * the file gets populated correctly.
 *
 * Run from this directory:
 *   node test.mjs
 */

import { execSync, spawnSync } from "node:child_process";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(__dirname, "update-bonfire.mjs");

let passed = 0;
let failed = 0;

function ok(name) {
	console.log(`  ✓ ${name}`);
	passed++;
}
function bad(name, detail) {
	console.error(`  ✗ ${name}`);
	if (detail) console.error(`    ${detail}`);
	failed++;
}

async function makeRepo({ optIn = true } = {}) {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), "bonfire-claude-test-"));
	execSync("git init -q && git checkout -qb main", { cwd: dir });
	execSync('git config user.email t@t && git config user.name t && touch README.md && git add -A && git commit -q -m init', { cwd: dir });
	if (optIn) await fs.mkdir(path.join(dir, ".bonfire"));
	return dir;
}

/**
 * Create a fake Claude session JSONL transcript at the path the adapter will
 * look up. Mirrors Claude Code's encoding (realpath + slash-to-hyphen) and
 * writes a transcript whose last `ai-title` entry contains the given summary.
 */
// Mirror Claude Code's encoding: realpath, then both `/` and `.` to `-`.
function encodeCwdForTest(p) {
	return p.replace(/[/.]/g, "-");
}

// Mirror update-bonfire.mjs's shortenSessionId (chars 8–16 of hyphen-stripped UUID).
function shortIdFor(uuid) {
	const noHyphens = uuid.replace(/-/g, "");
	return noHyphens.length >= 16 ? noHyphens.slice(8, 16) : noHyphens.slice(0, 8);
}

async function makeFakeClaudeSession(repoDir, sessionId, aiTitle) {
	const realDir = await fs.realpath(repoDir);
	const encoded = encodeCwdForTest(realDir);
	const claudeProjectDir = path.join(os.homedir(), ".claude", "projects", encoded);
	await fs.mkdir(claudeProjectDir, { recursive: true });
	const jsonlPath = path.join(claudeProjectDir, `${sessionId}.jsonl`);
	const lines = [
		{ type: "user", message: { role: "user", content: "test prompt" }, sessionId },
		{ type: "assistant", message: { role: "assistant", content: [{ type: "text", text: "test response" }] }, sessionId },
		{ type: "ai-title", aiTitle, sessionId },
	];
	await fs.writeFile(jsonlPath, lines.map((l) => JSON.stringify(l)).join("\n") + "\n");
	return { claudeProjectDir, jsonlPath };
}

async function updateFakeClaudeSession(repoDir, sessionId, newAiTitle) {
	const realDir = await fs.realpath(repoDir);
	const encoded = encodeCwdForTest(realDir);
	const jsonlPath = path.join(os.homedir(), ".claude", "projects", encoded, `${sessionId}.jsonl`);
	const current = await fs.readFile(jsonlPath, "utf8");
	const updated = current + JSON.stringify({ type: "ai-title", aiTitle: newAiTitle, sessionId }) + "\n";
	await fs.writeFile(jsonlPath, updated);
}

function runHook(input) {
	const result = spawnSync("node", [SCRIPT], {
		input: JSON.stringify(input),
		encoding: "utf8",
	});
	return { exitCode: result.status, stdout: result.stdout, stderr: result.stderr };
}

async function run() {
	console.log("\nclaude-code Stop hook smoke test");

	// --- Test 1: full flow ---
	const repo1 = await makeRepo();
	const sessionId1 = "11111111-2222-3333-4444-555555555555";
	const summary1 = "Test session: implement feature X";
	const { claudeProjectDir: claudeDir1 } = await makeFakeClaudeSession(repo1, sessionId1, summary1);

	const r1 = runHook({
		session_id: sessionId1,
		cwd: repo1,
		hook_event_name: "Stop",
	});

	if (r1.exitCode === 0) ok("hook exits 0 on success");
	else bad("hook exits 0", `exit ${r1.exitCode}; stderr: ${r1.stderr}`);

	const indexPath1 = path.join(repo1, ".bonfire", "index.md");
	let content1;
	try {
		content1 = await fs.readFile(indexPath1, "utf8");
		ok(".bonfire/index.md created");
	} catch (e) {
		bad(".bonfire/index.md created", e.message);
		content1 = "";
	}

	if (content1.includes("<!-- bonfire:auto-inflight:start v1 -->")) ok("in-flight fence present");
	else bad("in-flight fence present");

	if (content1.includes("Working on: Test session: implement feature X")) ok("in-flight populated with claude summary");
	else bad("in-flight populated", content1.slice(0, 300));

	if (content1.includes(`[claude:${shortIdFor(sessionId1)}]`)) ok("sessions row has correct claude key");
	else bad("sessions row key");

	if (content1.includes("Test session: implement feature X")) ok("sessions row has summary content");
	else bad("sessions row summary");

	// --- Test 2: idempotency (same summary = no write) ---
	const statBefore = await fs.stat(indexPath1);
	await new Promise((r) => setTimeout(r, 20)); // ensure clock-tick separation
	runHook({ session_id: sessionId1, cwd: repo1, hook_event_name: "Stop" });
	const statAfter = await fs.stat(indexPath1);
	if (statBefore.mtimeMs === statAfter.mtimeMs) ok("idempotent: same summary = no rewrite");
	else bad("idempotent", `mtime changed (before ${statBefore.mtimeMs}, after ${statAfter.mtimeMs})`);

	// --- Test 3: summary changes = file updates ---
	await updateFakeClaudeSession(repo1, sessionId1, "UPDATED: now working on feature Y");
	runHook({ session_id: sessionId1, cwd: repo1, hook_event_name: "Stop" });
	const content1b = await fs.readFile(indexPath1, "utf8");
	if (content1b.includes("UPDATED: now working on feature Y")) ok("summary change = file updates");
	else bad("summary change updates", content1b.slice(0, 400));

	const claude1Count = (content1b.match(new RegExp(`\\[claude:${shortIdFor(sessionId1)}\\]`, "g")) || []).length;
	if (claude1Count === 1) ok("updated session = single row (no duplicate)");
	else bad("no duplicate row", `found ${claude1Count} rows`);

	// --- Test 4: second session = second row, in-flight reflects latest ---
	const sessionId2 = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
	await makeFakeClaudeSession(repo1, sessionId2, "Second session: refactor module Z");
	runHook({ session_id: sessionId2, cwd: repo1, hook_event_name: "Stop" });
	const content2 = await fs.readFile(indexPath1, "utf8");

	if (content2.includes(`[claude:${shortIdFor(sessionId2)}]`)) ok("second session added second row");
	else bad("second session row");

	if (content2.includes("Second session: refactor module Z")) ok("in-flight updated to latest session");
	else bad("in-flight follows latest");

	if (content2.includes(`[claude:${shortIdFor(sessionId1)}]`)) ok("previous session row preserved");
	else bad("preserved previous row");

	// --- Test 5: non-Stop event = no-op ---
	const repo2 = await makeRepo();
	const sessionId3 = "33333333-4444-5555-6666-777777777777";
	await makeFakeClaudeSession(repo2, sessionId3, "Should not write");

	runHook({ session_id: sessionId3, cwd: repo2, hook_event_name: "PreToolUse" });
	try {
		await fs.access(path.join(repo2, ".bonfire", "index.md"));
		bad("non-Stop event = no bootstrap", "but .bonfire/index.md was created");
	} catch {
		ok("non-Stop event = no bootstrap");
	}

	// --- Test 6: non-git dir = no-op ---
	const nongit = await fs.mkdtemp(path.join(os.tmpdir(), "bonfire-claude-nongit-"));
	const sessionId4 = "44444444-5555-6666-7777-888888888888";
	await makeFakeClaudeSession(nongit, sessionId4, "Should not write");
	runHook({ session_id: sessionId4, cwd: nongit, hook_event_name: "Stop" });
	try {
		await fs.access(path.join(nongit, ".bonfire", "index.md"));
		bad("non-git dir = no-op", "but .bonfire/index.md was created");
	} catch {
		ok("non-git dir = no-op");
	}

	// --- Test 7: opt-out via .bonfire/config.json ---
	const repo3 = await makeRepo({ optIn: true });
	await fs.writeFile(path.join(repo3, ".bonfire", "config.json"), JSON.stringify({ auto: false }));
	const sessionId5 = "55555555-6666-7777-8888-999999999999";
	await makeFakeClaudeSession(repo3, sessionId5, "Should not write");
	runHook({ session_id: sessionId5, cwd: repo3, hook_event_name: "Stop" });
	try {
		await fs.access(path.join(repo3, ".bonfire", "index.md"));
		bad("auto:false = no-op", "but .bonfire/index.md was created");
	} catch {
		ok("auto:false = no-op");
	}

	// --- Test 8 (regression): symlink resolution. On macOS, mktemp creates
	// dirs under /var/folders which is a symlink to /private/var/folders.
	// Claude Code encodes the realpath, so the hook must realpath the cwd it
	// receives before looking up the sessions-index.json.
	const symRepo = await makeRepo({ optIn: true });
	const realRepo = await fs.realpath(symRepo);
	const sessionId7 = "77777777-8888-9999-aaaa-bbbbbbbbbbbb";
	await makeFakeClaudeSession(symRepo, sessionId7, "Test realpath resolution");
	if (symRepo !== realRepo) {
		// Pass the *unresolved* (symlink) cwd to the hook (what Claude Code sends).
		// If the hook doesn't realpath, it'll encode -var-... instead of -private-var-...
		// and miss the index file entirely.
		runHook({ session_id: sessionId7, cwd: symRepo, hook_event_name: "Stop" });
		const symContent = await fs.readFile(path.join(symRepo, ".bonfire", "index.md"), "utf8").catch(() => "");
		if (symContent.includes("Test realpath resolution")) ok("resolves symlinks before encoding cwd");
		else bad("resolves symlinks", `file: ${symContent.slice(0, 200)}`);
	} else {
		// /tmp isn't symlinked on this platform; skip
		ok("resolves symlinks (skipped: no symlink on this path)");
	}

	// --- Test 9 (regression): paths containing `.` characters. mktemp(`-t`)
	// on macOS produces names like `bonfire-test-XXXXXX.<rand>` with a dot;
	// Claude Code encodes that dot as `-`. The hook must match.
	const dotDir = await fs.mkdtemp(path.join(os.tmpdir(), "bonfire-dot-XXXXXX."));
	execSync("git init -q && git checkout -qb main && git config user.email t@t && git config user.name t && touch README.md && git add -A && git commit -q -m init", { cwd: dotDir });
	await fs.mkdir(path.join(dotDir, ".bonfire"));
	const sessionIdDot = "99999999-aaaa-bbbb-cccc-dddddddddddd";
	await makeFakeClaudeSession(dotDir, sessionIdDot, "Dot path encoding test");
	runHook({ session_id: sessionIdDot, cwd: dotDir, hook_event_name: "Stop" });
	const dotContent = await fs.readFile(path.join(dotDir, ".bonfire", "index.md"), "utf8").catch(() => "");
	if (dotContent.includes("Dot path encoding test")) ok("encodes `.` in path as `-`");
	else bad("encodes `.` in path as `-`", `file: ${dotContent.slice(0, 200)}`);

	// --- Test 10: git repo without .bonfire/ = no-op (the opt-in gate) ---
	const repo4 = await makeRepo({ optIn: false });
	const sessionId6 = "66666666-7777-8888-9999-aaaaaaaaaaaa";
	await makeFakeClaudeSession(repo4, sessionId6, "Should not write");
	runHook({ session_id: sessionId6, cwd: repo4, hook_event_name: "Stop" });
	try {
		await fs.access(path.join(repo4, ".bonfire"));
		bad("no .bonfire/ dir = no opt-in, no action", ".bonfire/ was created without user opting in");
	} catch {
		ok("no .bonfire/ dir = no opt-in, no action");
	}

	// --- Cleanup ---
	for (const dir of [repo1, repo2, nongit, repo3, repo4, symRepo, dotDir]) {
		await fs.rm(dir, { recursive: true, force: true });
		try {
			const realDir = await fs.realpath(dir).catch(() => dir);
			const enc = encodeCwdForTest(realDir);
			await fs.rm(path.join(os.homedir(), ".claude", "projects", enc), { recursive: true, force: true });
		} catch {}
	}

	console.log(`\n${passed} passed, ${failed} failed`);
	process.exit(failed === 0 ? 0 : 1);
}

run().catch((err) => {
	console.error("test runner failed:", err);
	process.exit(2);
});
