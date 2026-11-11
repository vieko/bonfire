#!/usr/bin/env node
/**
 * Contract for bonfire#50, parts 1 and 2: the Pi adapter writes nothing for
 * an ephemeral session (no session file) and nothing when BONFIRE=off.
 *
 * Drives the real extension through a fake ExtensionAPI and context, as
 * smoke.mjs does. Each case runs in its own temporary git repo.
 *
 * Run: tsx pi/skip.contract.mjs
 */

import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const { default: registerExtension } = await import("./extension.ts");
const { INFLIGHT_END, INFLIGHT_START, SESSIONS_END, SESSIONS_START } = await import("./lib.ts");

let passed = 0;
let failed = 0;
function check(cond, name) {
	if (cond) {
		console.log(`  ok   ${name}`);
		passed++;
	} else {
		console.error(`  FAIL ${name}`);
		failed++;
	}
}

const ENTRIES = [
	{ type: "session", id: "019e463b-0292-7b12-893a-1af8b99f4607" },
	{ type: "message", message: { role: "user", content: [{ type: "text", text: "ship the multi-tenant auth refactor" }] } },
	{
		type: "message",
		message: {
			role: "assistant",
			content: [
				{ type: "toolCall", name: "read", arguments: { path: "/repo/src/auth.ts" } },
				{ type: "toolCall", name: "edit", arguments: { path: "/repo/src/auth.ts" } },
				{ type: "toolCall", name: "bash", arguments: { command: "npm test" } },
				{ type: "toolCall", name: "bash", arguments: { command: "npm run lint" } },
			],
		},
	},
	{ type: "message", message: { role: "assistant", content: [{ type: "text", text: "The refactor is done and the tests pass." }] } },
];

const SUMMARY = `## Goal
Ship the multi-tenant auth refactor

## Progress
- Moved the tenant lookup into the resolver

## Next Steps
- Add the end-to-end test
`;

const INDEX = `# repo

Hand-written notes.

${INFLIGHT_START}
${INFLIGHT_END}

${SESSIONS_START}
## Sessions
${SESSIONS_END}
`;

function makeRepo({ withIndex }) {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bonfire-skip-"));
	execSync("git init -q", { cwd: dir });
	fs.mkdirSync(path.join(dir, ".bonfire"));
	if (withIndex) fs.writeFileSync(path.join(dir, ".bonfire", "index.md"), INDEX);
	return dir;
}

function readIndex(dir) {
	try {
		return fs.readFileSync(path.join(dir, ".bonfire", "index.md"), "utf8");
	} catch {
		return null;
	}
}

function makeApi() {
	const handlers = new Map();
	return {
		api: { on: (event, handler) => handlers.set(event, handler) },
		fire: (event, payload, ctx) => {
			const h = handlers.get(event);
			return h ? h(payload, ctx) : Promise.resolve();
		},
	};
}

function makeCtx({ cwd, sessionId, sessionFile }) {
	return {
		hasUI: false,
		cwd,
		sessionManager: {
			getSessionId: () => sessionId,
			getSessionFile: () => sessionFile,
			getEntries: () => ENTRIES,
		},
		getContextUsage: () => ({ percent: 5 }),
		ui: { theme: { fg: (_c, t) => t }, setStatus: () => {}, notify: () => {} },
	};
}

/** Runs one event through a freshly registered extension. `off` sets BONFIRE=off before registration. */
async function run({ event, sessionId, sessionFile, withIndex, off }) {
	const dir = makeRepo({ withIndex });
	const before = process.env.BONFIRE;
	if (off) process.env.BONFIRE = "off";
	else delete process.env.BONFIRE;
	try {
		const { api, fire } = makeApi();
		registerExtension(api);
		const ctx = makeCtx({ cwd: dir, sessionId, sessionFile });
		const payload =
			event === "session_compact"
				? { type: "session_compact", compactionEntry: { id: "c1", summary: SUMMARY } }
				: { type: event };
		await fire(event, payload, ctx);
		return readIndex(dir);
	} finally {
		if (before === undefined) delete process.env.BONFIRE;
		else process.env.BONFIRE = before;
		fs.rmSync(dir, { recursive: true, force: true });
	}
}

const FILE = "/tmp/bonfire-contract-session.jsonl";

console.log("contract: control (a saved session still writes)");
{
	const out = await run({ event: "session_shutdown", sessionId: "aaaa0001-0000-4000-8000-000000000001", sessionFile: FILE, withIndex: true });
	check(out !== null && out.includes("[pi:"), "shutdown fallback writes a row for a saved session");
	const boot = await run({ event: "session_shutdown", sessionId: "aaaa0002-0000-4000-8000-000000000002", sessionFile: FILE, withIndex: false });
	check(boot !== null && boot.includes("[pi:"), "shutdown fallback bootstraps index.md for a saved session");
	const comp = await run({ event: "session_compact", sessionId: "aaaa0003-0000-4000-8000-000000000003", sessionFile: FILE, withIndex: true });
	check(comp !== null && comp.includes("[pi:"), "compaction writes a row for a saved session");
}

console.log("contract: ephemeral session (getSessionFile() is undefined)");
{
	const out = await run({ event: "session_shutdown", sessionId: "bbbb0001-0000-4000-8000-000000000001", sessionFile: undefined, withIndex: true });
	check(out === INDEX, "shutdown leaves an existing index.md byte-identical");
	const boot = await run({ event: "session_shutdown", sessionId: "bbbb0002-0000-4000-8000-000000000002", sessionFile: undefined, withIndex: false });
	check(boot === null, "shutdown does not create index.md");
	const comp = await run({ event: "session_compact", sessionId: "bbbb0003-0000-4000-8000-000000000003", sessionFile: undefined, withIndex: true });
	check(comp === INDEX, "compaction leaves an existing index.md byte-identical");
}

console.log("contract: BONFIRE=off");
{
	const out = await run({ event: "session_shutdown", sessionId: "cccc0001-0000-4000-8000-000000000001", sessionFile: FILE, withIndex: true, off: true });
	check(out === INDEX, "shutdown leaves an existing index.md byte-identical");
	const boot = await run({ event: "session_shutdown", sessionId: "cccc0002-0000-4000-8000-000000000002", sessionFile: FILE, withIndex: false, off: true });
	check(boot === null, "shutdown does not create index.md");
	const comp = await run({ event: "session_compact", sessionId: "cccc0003-0000-4000-8000-000000000003", sessionFile: FILE, withIndex: true, off: true });
	check(comp === INDEX, "compaction leaves an existing index.md byte-identical");
	const failedCompact = await run({ event: "session_compact_failed", sessionId: "cccc0004-0000-4000-8000-000000000004", sessionFile: FILE, withIndex: true, off: true });
	check(failedCompact === INDEX, "a failed compaction leaves an existing index.md byte-identical");
}

console.log("contract: any other BONFIRE value keeps the adapter on");
{
	const before = process.env.BONFIRE;
	process.env.BONFIRE = "on";
	try {
		const dir = makeRepo({ withIndex: true });
		try {
			const { api, fire } = makeApi();
			registerExtension(api);
			await fire("session_shutdown", { type: "session_shutdown" }, makeCtx({ cwd: dir, sessionId: "dddd0001-0000-4000-8000-000000000001", sessionFile: FILE }));
			const out = readIndex(dir);
			check(out !== null && out.includes("[pi:"), "BONFIRE=on still writes");
		} finally {
			fs.rmSync(dir, { recursive: true, force: true });
		}
	} finally {
		if (before === undefined) delete process.env.BONFIRE;
		else process.env.BONFIRE = before;
	}
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
