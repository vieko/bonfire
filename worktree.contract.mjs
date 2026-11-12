#!/usr/bin/env node
/**
 * Contract for bonfire#52: a session in a linked git worktree keeps its
 * in-flight block local and also upserts its Sessions row into the main
 * worktree's index. The main index's in-flight block is never touched.
 *
 * Covers both code adapters: the Pi extension through a fake ExtensionAPI
 * (as pi/skip.contract.mjs does) and the Claude Stop hook as a child process
 * with a temporary HOME. Each case builds its own main repo + linked worktree.
 *
 * Run: tsx worktree.contract.mjs
 */

import { execSync, spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { default: registerExtension } = await import("./pi/extension.ts");
const { INFLIGHT_END, INFLIGHT_START, SESSIONS_END, SESSIONS_START, shortenSessionId } = await import("./pi/lib.ts");
const CLAUDE_HOOK = path.join(__dirname, "claude", "update-bonfire.mjs");

let passed = 0;
let failed = 0;
function check(cond, name, detail) {
	if (cond) {
		console.log(`  ok   ${name}`);
		passed++;
	} else {
		console.error(`  FAIL ${name}`);
		if (detail) console.error(`       ${detail}`);
		failed++;
	}
}

// --- fixtures -------------------------------------------------------------

const MAIN_INFLIGHT = `
## In flight

_Updated 2026-11-01 from pi:0badc0de on \`main\`_

### Goal
The main checkout's own work. A worktree session must not replace this.
`;

const MAIN_ROW = "- 2026-11-01 [pi:0badc0de] main — the main checkout's own work";

function indexWith(inflight, rows) {
	return `# repo

Hand-written notes.

${INFLIGHT_START}${inflight}${INFLIGHT_END}

${SESSIONS_START}
## Sessions
${rows.join("\n")}${rows.length ? "\n" : ""}${SESSIONS_END}
`;
}

const MAIN_INDEX = indexWith(MAIN_INFLIGHT, [MAIN_ROW]);

const ENTRIES = (sessionId) => [
	{ type: "session", id: sessionId },
	{ type: "message", message: { role: "user", content: [{ type: "text", text: "ship the worktree row change" }] } },
	{
		type: "message",
		message: {
			role: "assistant",
			content: [
				{ type: "toolCall", name: "edit", arguments: { path: "/repo/src/a.ts" } },
				{ type: "toolCall", name: "bash", arguments: { command: "npm test" } },
			],
		},
	},
	{ type: "message", message: { role: "assistant", content: [{ type: "text", text: "Done; tests pass." }] } },
];

const SUMMARY = `## Goal
Ship the worktree row change

## Progress
- Resolved the main worktree

## Next Steps
- Add the docs
`;

function git(cwd, cmd) {
	return execSync(`git ${cmd}`, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

/**
 * Builds <tmp>/main (a repo on `main` with one commit) and <tmp>/wt (a linked
 * worktree on `feature`, or detached). Options:
 *   mainBonfire   create main/.bonfire/ (default true)
 *   mainIndex     content of main/.bonfire/index.md, or null for none
 *   mainConfig    content of main/.bonfire/config.json, or null
 *   wtBonfire     create wt/.bonfire/ (as when .bonfire/.gitignore is tracked)
 *   detached      check the worktree out at a detached HEAD
 */
function makeWorktreePair({ mainBonfire = true, mainIndex = MAIN_INDEX, mainConfig = null, wtBonfire = true, detached = false } = {}) {
	const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "bonfire-wt-")));
	const main = path.join(tmp, "main");
	const wt = path.join(tmp, "wt");
	fs.mkdirSync(main);
	git(main, "init -q");
	git(main, "checkout -qb main");
	git(main, "config user.email t@t");
	git(main, "config user.name t");
	fs.writeFileSync(path.join(main, "README.md"), "x\n");
	git(main, "add README.md");
	git(main, "commit -qm init");
	if (mainBonfire) {
		fs.mkdirSync(path.join(main, ".bonfire"));
		if (mainIndex !== null) fs.writeFileSync(path.join(main, ".bonfire", "index.md"), mainIndex);
		if (mainConfig !== null) fs.writeFileSync(path.join(main, ".bonfire", "config.json"), mainConfig);
	}
	git(main, detached ? `worktree add -q --detach ${JSON.stringify(wt)}` : `worktree add -q -b feature ${JSON.stringify(wt)}`);
	if (wtBonfire) fs.mkdirSync(path.join(wt, ".bonfire"));
	return { tmp, main, wt };
}

function read(p) {
	try {
		return fs.readFileSync(p, "utf8");
	} catch {
		return null;
	}
}
const mainIndexOf = (pair) => read(path.join(pair.main, ".bonfire", "index.md"));
const wtIndexOf = (pair) => read(path.join(pair.wt, ".bonfire", "index.md"));

function fence(content, start, end) {
	if (content === null) return null;
	const s = content.indexOf(start);
	const e = content.indexOf(end, s);
	if (s === -1 || e === -1) return null;
	return content.slice(s + start.length, e);
}
const inflightOf = (c) => fence(c, INFLIGHT_START, INFLIGHT_END);
const rowsOf = (c) => {
	const f = fence(c, SESSIONS_START, SESSIONS_END);
	return f === null ? [] : f.split("\n").filter((l) => l.startsWith("- "));
};
const rowFor = (c, tag) => rowsOf(c).filter((r) => r.includes(tag));

// --- drivers --------------------------------------------------------------

function makePi() {
	const handlers = new Map();
	registerExtension({ on: (event, handler) => handlers.set(event, handler) });
	return (event, payload, ctx) => {
		const h = handlers.get(event);
		return h ? h(payload, ctx) : Promise.resolve();
	};
}

function piCtx(cwd, sessionId) {
	return {
		hasUI: false,
		cwd,
		sessionManager: {
			getSessionId: () => sessionId,
			getSessionFile: () => "/tmp/bonfire-worktree-contract.jsonl",
			getEntries: () => ENTRIES(sessionId),
		},
		getContextUsage: () => ({ percent: 5 }),
		ui: { theme: { fg: (_c, t) => t }, setStatus: () => {}, notify: () => {} },
	};
}

async function runPi(event, cwd, sessionId, summary = SUMMARY) {
	const before = process.env.BONFIRE;
	delete process.env.BONFIRE;
	try {
		const fire = makePi();
		const payload =
			event === "session_compact"
				? { type: "session_compact", compactionEntry: { id: "c1", summary } }
				: { type: event };
		await fire(event, payload, piCtx(cwd, sessionId));
	} finally {
		if (before !== undefined) process.env.BONFIRE = before;
	}
}

function runClaude(home, cwd, sessionId, title) {
	const encoded = fs.realpathSync(cwd).replace(/[/.]/g, "-");
	const dir = path.join(home, ".claude", "projects", encoded);
	fs.mkdirSync(dir, { recursive: true });
	fs.writeFileSync(
		path.join(dir, `${sessionId}.jsonl`),
		[
			{ type: "user", message: { role: "user", content: "x" }, sessionId },
			{ type: "ai-title", aiTitle: title, sessionId },
		]
			.map((l) => JSON.stringify(l))
			.join("\n") + "\n",
	);
	const r = spawnSync("node", [CLAUDE_HOOK], {
		input: JSON.stringify({ session_id: sessionId, cwd, hook_event_name: "Stop" }),
		encoding: "utf8",
		env: { ...process.env, HOME: home, BONFIRE: "" },
	});
	if (r.status !== 0) throw new Error(`claude hook exited ${r.status}: ${r.stderr}`);
}

// --- cases ----------------------------------------------------------------

const PI_IDS = {
	shutdown: "019e463b-1111-7b12-893a-1af8b99f4601",
	compact: "019e463b-2222-7b12-893a-1af8b99f4602",
	again: "019e463b-3333-7b12-893a-1af8b99f4603",
	main: "019e463b-4444-7b12-893a-1af8b99f4604",
	detached: "019e463b-5555-7b12-893a-1af8b99f4605",
	noMain: "019e463b-6666-7b12-893a-1af8b99f4606",
	optOut: "019e463b-7777-7b12-893a-1af8b99f4607",
	noLocal: "019e463b-8888-7b12-893a-1af8b99f4608",
	keep: "019e463b-9999-7b12-893a-1af8b99f4609",
};
const piTag = (id) => `[pi:${shortenSessionId(id)}]`;

const pairs = [];
function pair(opts) {
	const p = makeWorktreePair(opts);
	pairs.push(p);
	return p;
}

try {
	for (const event of ["session_shutdown", "session_compact"]) {
		const id = event === "session_shutdown" ? PI_IDS.shutdown : PI_IDS.compact;
		const tag = piTag(id);
		console.log(`contract: pi ${event} in a linked worktree (worktree has .bonfire/)`);
		const p = pair();
		await runPi(event, p.wt, id);
		const main = mainIndexOf(p);
		const local = wtIndexOf(p);

		const mainRows = rowFor(main, tag);
		check(mainRows.length === 1, "main index gets exactly one row for the session", `rows: ${JSON.stringify(rowsOf(main))}`);
		check(mainRows[0]?.includes(`${tag} feature —`), "the main-index row names the worktree branch", mainRows[0]);
		check(inflightOf(main) === MAIN_INFLIGHT, "main index in-flight block is byte-identical");
		check(rowFor(main, "[pi:0badc0de]").length === 1, "main index keeps its existing row");
		check(main.startsWith("# repo\n\nHand-written notes.\n"), "main index text outside the fences is unchanged");

		check(local !== null && rowFor(local, tag).length === 1, "worktree index still gets its own row (local behaviour unchanged)");
		check(local !== null && (inflightOf(local) ?? "").includes(`on \`feature\``), "worktree index gets the in-flight block");
		check(rowFor(local, tag)[0] === mainRows[0], "the row is byte-identical in both indexes");
	}

	console.log("contract: pi re-run in the same worktree session updates, not duplicates");
	{
		const p = pair();
		await runPi("session_compact", p.wt, PI_IDS.again);
		await runPi("session_shutdown", p.wt, PI_IDS.again);
		await runPi("session_compact", p.wt, PI_IDS.again);
		check(rowFor(mainIndexOf(p), piTag(PI_IDS.again)).length === 1, "one row per session in the main index");
		check(inflightOf(mainIndexOf(p)) === MAIN_INFLIGHT, "main in-flight still byte-identical");
	}

	console.log("contract: pi worktree without its own .bonfire/ (default: .bonfire/ untracked)");
	{
		const p = pair({ wtBonfire: false });
		await runPi("session_shutdown", p.wt, PI_IDS.noLocal);
		check(rowFor(mainIndexOf(p), piTag(PI_IDS.noLocal)).length === 1, "main index gets the row");
		check(inflightOf(mainIndexOf(p)) === MAIN_INFLIGHT, "main in-flight byte-identical");
		check(!fs.existsSync(path.join(p.wt, ".bonfire")), "no .bonfire/ is created in the worktree");
	}

	console.log("contract: pi shutdown keeps a compaction row (worktree without .bonfire/)");
	{
		const p = pair({ wtBonfire: false });
		await runPi("session_compact", p.wt, PI_IDS.keep, "## Goal\nCompaction goal wins\n\n## Progress\n- a\n");
		const afterCompact = rowFor(mainIndexOf(p), piTag(PI_IDS.keep));
		await runPi("session_shutdown", p.wt, PI_IDS.keep);
		const afterShutdown = rowFor(mainIndexOf(p), piTag(PI_IDS.keep));
		check(afterCompact[0]?.endsWith("— Compaction goal wins"), "compaction writes its one-liner to the main index", afterCompact[0]);
		check(afterShutdown.length === 1 && afterShutdown[0] === afterCompact[0], "the shutdown fallback does not replace it", afterShutdown[0]);
	}

	console.log("contract: pi session in the main worktree behaves as before");
	{
		const p = pair();
		await runPi("session_compact", p.main, PI_IDS.main);
		const main = mainIndexOf(p);
		check(rowFor(main, piTag(PI_IDS.main)).length === 1, "main index gets one row");
		check(rowFor(main, piTag(PI_IDS.main))[0]?.includes(" main —"), "row names branch main");
		check((inflightOf(main) ?? "").includes(`from pi:${shortenSessionId(PI_IDS.main)} on \`main\``), "main in-flight is replaced by the main session");
		check(wtIndexOf(p) === null, "the worktree index is not created");
	}

	console.log("contract: pi detached worktree adds no row to the main index");
	{
		const p = pair({ detached: true });
		await runPi("session_shutdown", p.wt, PI_IDS.detached);
		check(mainIndexOf(p) === MAIN_INDEX, "main index is byte-identical");
		check(rowFor(wtIndexOf(p), piTag(PI_IDS.detached)).length === 1, "worktree index still gets its local row");
	}

	console.log("contract: main worktree not opted in");
	{
		const p = pair({ mainBonfire: false });
		await runPi("session_shutdown", p.wt, PI_IDS.noMain);
		check(!fs.existsSync(path.join(p.main, ".bonfire")), "no .bonfire/ is created in the main worktree");
		check(rowFor(wtIndexOf(p), piTag(PI_IDS.noMain)).length === 1, "worktree index still gets its local row");
	}

	console.log("contract: main worktree opted out with config auto:false");
	{
		const p = pair({ mainConfig: '{ "auto": false }\n' });
		await runPi("session_shutdown", p.wt, PI_IDS.optOut);
		check(mainIndexOf(p) === MAIN_INDEX, "main index is byte-identical");
	}

	// --- claude ---
	const home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "bonfire-wt-home-")));
	pairs.push({ tmp: home });
	const CL = {
		wt: "aaaaaaaa-1111-2222-3333-444444444444",
		noLocal: "aaaaaaaa-5555-2222-3333-444444444444",
		main: "aaaaaaaa-6666-2222-3333-444444444444",
		detached: "aaaaaaaa-7777-2222-3333-444444444444",
		noMain: "aaaaaaaa-8888-2222-3333-444444444444",
	};
	const clTag = (id) => `[claude:${shortenSessionId(id)}]`;

	console.log("contract: claude Stop in a linked worktree (worktree has .bonfire/)");
	{
		const p = pair();
		runClaude(home, p.wt, CL.wt, "claude worktree work");
		runClaude(home, p.wt, CL.wt, "claude worktree work");
		const main = mainIndexOf(p);
		const rows = rowFor(main, clTag(CL.wt));
		check(rows.length === 1, "main index gets exactly one row, also after a second Stop", JSON.stringify(rowsOf(main)));
		check(rows[0]?.includes(`${clTag(CL.wt)} feature —`), "the main-index row names the worktree branch", rows[0]);
		check(inflightOf(main) === MAIN_INFLIGHT, "main index in-flight block is byte-identical");
		check(rowFor(wtIndexOf(p), clTag(CL.wt))[0] === rows[0], "the row is byte-identical in both indexes");
		check((inflightOf(wtIndexOf(p)) ?? "").includes("on `feature`"), "worktree index gets the in-flight block");
	}

	console.log("contract: claude worktree without its own .bonfire/");
	{
		const p = pair({ wtBonfire: false });
		runClaude(home, p.wt, CL.noLocal, "claude no local");
		check(rowFor(mainIndexOf(p), clTag(CL.noLocal)).length === 1, "main index gets the row");
		check(inflightOf(mainIndexOf(p)) === MAIN_INFLIGHT, "main in-flight byte-identical");
		check(!fs.existsSync(path.join(p.wt, ".bonfire")), "no .bonfire/ is created in the worktree");
	}

	console.log("contract: claude in the main worktree behaves as before");
	{
		const p = pair();
		runClaude(home, p.main, CL.main, "claude main work");
		const main = mainIndexOf(p);
		check(rowFor(main, clTag(CL.main)).length === 1, "main index gets one row");
		check((inflightOf(main) ?? "").includes(`from claude:${shortenSessionId(CL.main)} on \`main\``), "main in-flight is replaced");
		check(wtIndexOf(p) === null, "the worktree index is not created");
	}

	console.log("contract: claude detached worktree and main not opted in");
	{
		const d = pair({ detached: true });
		runClaude(home, d.wt, CL.detached, "claude detached");
		check(mainIndexOf(d) === MAIN_INDEX, "detached: main index is byte-identical");
		const n = pair({ mainBonfire: false });
		runClaude(home, n.wt, CL.noMain, "claude no main");
		check(!fs.existsSync(path.join(n.main, ".bonfire")), "not opted in: no .bonfire/ is created in the main worktree");
	}

	console.log("contract: the fallback skill documents the main-worktree row");
	{
		const end = read(path.join(__dirname, "skills", "bonfire", "commands", "end.md")) ?? "";
		check(/main worktree/i.test(end), "end.md names the main worktree");
		check(end.includes("--git-common-dir") || end.includes("worktree list"), "end.md says how to find it");
		check(/detached/i.test(end), "end.md covers the detached case");
	}
} finally {
	for (const p of pairs) fs.rmSync(p.tmp, { recursive: true, force: true });
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
