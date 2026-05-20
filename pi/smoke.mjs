#!/usr/bin/env node
/**
 * Composition smoke test for the v7.1 entry-based fallback.
 *
 * Unit tests cover lib.ts pure functions in isolation. This test exercises
 * the composed flow that extension.ts uses:
 *
 *   1. Read existing `.bonfire/index.md` (pre-loaded with stale "what's next?"
 *      pollution simulating pi#4811 fallout).
 *   2. Compute rollup from synthetic session entries.
 *   3. Render fallback inflight, replace the inflight fence, upsert the row.
 *   4. Atomic write, re-read, assert the output.
 *
 * Catches integration bugs the unit tests miss: fence × rollup × renderer ×
 * upsert × file-IO working together against a realistic index.md.
 *
 * Run via:
 *   node --import=tsx smoke.mjs
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
	extractFenceContent,
	hasEnoughSignal,
	INFLIGHT_END,
	INFLIGHT_START,
	renderFallbackInflightFromEntries,
	replaceFence,
	rollupOneLiner,
	SESSIONS_END,
	SESSIONS_START,
	summarizeSessionEntries,
	upsertSessionRow,
} from "./lib.ts";

let passed = 0;
let failed = 0;

function assert(cond, name) {
	if (cond) {
		console.log(`  ✓ ${name}`);
		passed++;
	} else {
		console.error(`  ✗ ${name}`);
		failed++;
	}
}

// --- Fixture: a stale .bonfire/index.md exactly like the gtm/internal-agents
// pollution we observed today. Single stale row, single stale in-flight, both
// reading "what's next?" from the first-prompt fallback path that v7.1
// replaces.

const STALE_INDEX = `# smoke-repo

${INFLIGHT_START}
## In flight

_Updated 2026-05-15 from pi:deadbeef on \`main\`_

### Goal
what's next?
${INFLIGHT_END}

${SESSIONS_START}
## Sessions

- 2026-05-15 [pi:deadbeef] main — what's next?
${SESSIONS_END}
`;

// --- Fixture: synthetic session entries shaped like real Pi JSONL. The user
// starts with a low-signal "what's next?", then pivots to real work, then
// the agent edits + writes some files and wraps up with a PR announcement.

const SYNTHETIC_ENTRIES = [
	{ type: "session", id: "019e463b-0292-7b12-893a-1af8b99f4607" },
	{
		type: "message",
		message: { role: "user", content: [{ type: "text", text: "what's next?" }] },
	},
	{
		type: "message",
		message: { role: "assistant", content: [{ type: "text", text: "Here's the queue..." }] },
	},
	{
		type: "message",
		message: {
			role: "user",
			content: [{ type: "text", text: "ship the multi-tenant auth refactor" }],
		},
	},
	{
		type: "message",
		message: {
			role: "assistant",
			content: [
				{ type: "toolCall", name: "read", arguments: { path: "/repo/src/auth.ts" } },
				{ type: "toolCall", name: "edit", arguments: { path: "/repo/src/auth.ts" } },
				{ type: "toolCall", name: "write", arguments: { path: "/repo/src/tenant.ts" } },
				{ type: "toolCall", name: "bash", arguments: { command: "npm test" } },
				{ type: "toolCall", name: "bash", arguments: { command: "npm run lint" } },
				{ type: "toolCall", name: "bash", arguments: { command: "gh pr create" } },
			],
		},
	},
	{
		type: "message",
		message: { role: "user", content: [{ type: "text", text: "open the PR" }] },
	},
	{
		type: "message",
		message: {
			role: "assistant",
			content: [
				{
					type: "text",
					text: "PR #4242 opened: feat(auth): multi-tenant support\n\nhttps://github.com/example/repo/pull/4242",
				},
			],
		},
	},
];

const SHORT_ID = "02927b12"; // slice(8,16) of the synthetic session id
const META = {
	date: "2026-05-20",
	host: "pi",
	shortId: SHORT_ID,
	branch: "vieko/auth-refactor",
};

// --- Run the composed flow inside a tmpdir, atomically write, re-read, assert.

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "bonfire-smoke-"));
const bonfireDir = path.join(tmp, ".bonfire");
fs.mkdirSync(bonfireDir);
const indexPath = path.join(bonfireDir, "index.md");
fs.writeFileSync(indexPath, STALE_INDEX, "utf8");

try {
	console.log(`\nsmoke: composed flow in ${tmp}`);

	const before = fs.readFileSync(indexPath, "utf8");
	assert(before.includes("what's next?"), "pre-state: stale 'what's next?' present");
	assert(before.includes("[pi:deadbeef]"), "pre-state: stale row present");

	// 1. Roll up entries
	const rollup = summarizeSessionEntries(SYNTHETIC_ENTRIES);
	assert(hasEnoughSignal(rollup), "rollup has enough signal (substantive goal + 6 tool events)");
	assert(rollup.goal === "ship the multi-tenant auth refactor", "rollup goal correct");
	assert(rollup.recentDirection === "open the PR", "recent direction correct");
	assert(rollup.written.includes("/repo/src/tenant.ts"), "written file captured");
	assert(rollup.bashCount === 3, "bash count correct");

	// 2. Render fallback inflight
	const inflightMd = renderFallbackInflightFromEntries(rollup, META, ["src/auth.ts"], "/repo");
	assert(inflightMd.includes("### Goal"), "rendered inflight has Goal");
	assert(inflightMd.includes("### Recent direction"), "rendered inflight has Recent direction");
	assert(inflightMd.includes("PR #4242"), "rendered inflight preserves last assistant text");

	// 3. Apply via replaceFence + upsertSessionRow
	let next = replaceFence(before, INFLIGHT_START, INFLIGHT_END, inflightMd);
	assert(next !== null, "replaceFence found the inflight fence");

	const oneLiner = rollupOneLiner(rollup);
	assert(oneLiner === "ship the multi-tenant auth refactor", "oneLiner is the cleaned goal");
	const row = `- ${META.date} [pi:${SHORT_ID}] ${META.branch} — ${oneLiner}`;
	next = upsertSessionRow(next, `[pi:${SHORT_ID}]`, row);
	assert(next !== null, "upsertSessionRow found the sessions fence");

	// 4. Atomic write + re-read
	const tmpFile = `${indexPath}.bonfire-tmp-${process.pid}`;
	fs.writeFileSync(tmpFile, next, "utf8");
	fs.renameSync(tmpFile, indexPath);

	const after = fs.readFileSync(indexPath, "utf8");

	// --- Assertions on the final file
	assert(!after.includes("### Goal\nwhat's next?"), "stale 'what's next?' Goal line removed");
	assert(after.includes("ship the multi-tenant auth refactor"), "new Goal present");
	assert(after.includes("### Recent direction"), "Recent direction section present");
	assert(after.includes("### Done"), "Done section present");
	assert(after.includes("- Wrote `src/tenant.ts`"), "Wrote row with cwd-relative path");
	assert(after.includes("### Where we left off"), "Where we left off section present");
	assert(after.includes("PR #4242 opened"), "last assistant text surfaced verbatim");
	assert(after.includes("### Uncommitted"), "Uncommitted section present");
	assert(after.includes("- `src/auth.ts`"), "uncommitted file listed");

	// Fence integrity
	assert(after.includes(INFLIGHT_START), "inflight start fence preserved");
	assert(after.includes(INFLIGHT_END), "inflight end fence preserved");
	assert(after.includes(SESSIONS_START), "sessions start fence preserved");
	assert(after.includes(SESSIONS_END), "sessions end fence preserved");

	// Row state
	assert(after.includes(`[pi:${SHORT_ID}]`), "new session row present");
	assert(after.includes("[pi:deadbeef]"), "prior session row preserved (not exceeded cap)");
	const newRowIdx = after.indexOf(`[pi:${SHORT_ID}]`);
	const oldRowIdx = after.indexOf("[pi:deadbeef]");
	assert(newRowIdx < oldRowIdx && newRowIdx !== -1, "newest row is first");

	// Idempotency: running the same flow twice produces byte-identical output.
	const rerun = replaceFence(after, INFLIGHT_START, INFLIGHT_END, inflightMd);
	const rerun2 = upsertSessionRow(rerun, `[pi:${SHORT_ID}]`, row);
	assert(rerun2 === after, "idempotent: re-running with same inputs produces no change");

	// File header preserved
	assert(after.startsWith("# smoke-repo\n"), "user-curated repo title preserved above fences");

	// --- Render the final file for visual inspection
	console.log("\n--- final index.md ---");
	console.log(after);
} finally {
	fs.rmSync(tmp, { recursive: true, force: true });
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
