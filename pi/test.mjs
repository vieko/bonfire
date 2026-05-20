/**
 * Smoke tests for lib.ts. Run via:
 *   node --import=tsx test.mjs
 *
 * Exits non-zero on first failure. No test framework dependency.
 */

import {
	bootstrapTemplate,
	extractFenceContent,
	extractFirstUserPrompt,
	extractOneLiner,
	extractSection,
	extractSubsection,
	findRowForKey,
	hasEnoughSignal,
	INFLIGHT_END,
	INFLIGHT_START,
	isGarbageSummary,
	isLowSignalPrompt,
	MAX_SESSION_ROWS,
	renderFallbackInflight,
	renderFallbackInflightFromEntries,
	renderInflight,
	replaceFence,
	rollupOneLiner,
	SESSIONS_END,
	SESSIONS_START,
	shortenSessionId,
	summarizeSessionEntries,
	upsertSessionRow,
} from "./lib.ts";

let passed = 0;
let failed = 0;

function eq(actual, expected, name) {
	if (actual === expected) {
		console.log(`  ✓ ${name}`);
		passed++;
	} else {
		console.error(`  ✗ ${name}`);
		console.error(`    expected: ${JSON.stringify(expected)}`);
		console.error(`    actual:   ${JSON.stringify(actual)}`);
		failed++;
	}
}

function truthy(actual, name) {
	if (actual) {
		console.log(`  ✓ ${name}`);
		passed++;
	} else {
		console.error(`  ✗ ${name} (expected truthy, got ${JSON.stringify(actual)})`);
		failed++;
	}
}

function contains(haystack, needle, name) {
	if (typeof haystack === "string" && haystack.includes(needle)) {
		console.log(`  ✓ ${name}`);
		passed++;
	} else {
		console.error(`  ✗ ${name}`);
		console.error(`    looking for: ${JSON.stringify(needle)}`);
		console.error(`    inside:      ${JSON.stringify(haystack)}`);
		failed++;
	}
}

function notContains(haystack, needle, name) {
	if (typeof haystack === "string" && !haystack.includes(needle)) {
		console.log(`  ✓ ${name}`);
		passed++;
	} else {
		console.error(`  ✗ ${name}: still contains ${JSON.stringify(needle)}`);
		failed++;
	}
}

// Realistic Pi compaction summary matching the format in docs/compaction.md
const FULL_SUMMARY = `## Goal
Build Bonfire 7.0: file convention + per-host adapters for Pi and Claude Code

## Constraints & Preferences
- Cross-agent visibility via .bonfire/index.md
- No skill rituals; adapters do the work

## Progress
### Done
- [x] Pi extension scaffolded (extension.ts, lib.ts, README.md)
- [x] Tests for extraction logic

### In Progress
- [ ] Smoke tests for fence handling
- [ ] Sandbox test against ~/.dotfiles

### Blocked
- Waiting on user confirmation to migrate existing .bonfire/index.md files

## Key Decisions
- **session_compact, not session_before_compact**: observe, don't replace
- **Two fences**: in-flight (replaced) + sessions (accumulated)

## Next Steps
1. Run smoke tests and verify all pass
2. Install adapter locally and trigger /compact
3. Port hook to Claude Code

## Critical Context
- The handoff command was removed; native primitives cover the use case
- gtm/.bonfire/ needs cleanup (specs/, archive/, 18MB JSON)
`;

const META = { date: "2026-05-19", host: "pi", shortId: "a1b2c3d4", branch: "main" };

console.log("\nextractSection");
eq(extractSection(FULL_SUMMARY, "Goal"), "Build Bonfire 7.0: file convention + per-host adapters for Pi and Claude Code", "Goal returns single line");
eq(extractSection(FULL_SUMMARY, "Nonexistent"), null, "missing section returns null");
truthy(extractSection(FULL_SUMMARY, "Progress")?.includes("### Done"), "Progress includes its sub-sections");
eq(extractSection(FULL_SUMMARY, "goal"), "Build Bonfire 7.0: file convention + per-host adapters for Pi and Claude Code", "case insensitive");

console.log("\nextractSubsection");
eq(
	extractSubsection(FULL_SUMMARY, "Progress", "In Progress"),
	"- [ ] Smoke tests for fence handling\n- [ ] Sandbox test against ~/.dotfiles",
	"In Progress under Progress",
);
eq(
	extractSubsection(FULL_SUMMARY, "Progress", "Blocked"),
	"- Waiting on user confirmation to migrate existing .bonfire/index.md files",
	"Blocked under Progress",
);
eq(extractSubsection(FULL_SUMMARY, "Progress", "Nonexistent"), null, "missing subsection returns null");
eq(extractSubsection(FULL_SUMMARY, "MissingParent", "Done"), null, "missing parent returns null");

console.log("\nextractOneLiner");
eq(
	extractOneLiner(FULL_SUMMARY),
	"Build Bonfire 7.0: file convention + per-host adapters for Pi and Claude Code",
	"prefers Goal first line",
);
eq(extractOneLiner("No structure here, just text."), "No structure here, just text.", "fallback to first non-header line");
eq(
	extractOneLiner("## Goal\n\n- bullet that's the goal"),
	"bullet that's the goal",
	"strips list marker",
);
eq(extractOneLiner(""), null, "empty summary returns null");
eq(extractOneLiner("# heading only\n## heading only"), null, "all-header summary returns null");

const LONG = "x".repeat(300);
const truncated = extractOneLiner(LONG);
truthy(truncated && truncated.length <= 200, "truncates at ONE_LINER_MAX");
truthy(truncated && truncated.endsWith("…"), "ellipsis appended when truncated");

console.log("\nrenderInflight");
const inflight = renderInflight(FULL_SUMMARY, META);
truthy(inflight, "renders non-null with full summary");
contains(inflight, "## In flight", "has top-level heading");
contains(inflight, "_Updated 2026-05-19 from pi:a1b2c3d4 on `main`_", "timestamp line");
contains(inflight, "### Goal", "Goal section");
contains(inflight, "### In Progress", "In Progress section");
contains(inflight, "### Blocked", "Blocked section");
contains(inflight, "### Next Steps", "Next Steps section");

eq(renderInflight("just prose, no structure", META), null, "returns null when no extractable sections");
eq(renderInflight("", META), null, "returns null on empty");

const goalOnly = renderInflight("## Goal\nJust the goal", META);
truthy(goalOnly, "renders with only Goal");
contains(goalOnly, "### Goal", "Goal present");
notContains(goalOnly, "### In Progress", "no empty In Progress");

console.log("\nreplaceFence");
const FENCED = `before\n${INFLIGHT_START}\nold body\n${INFLIGHT_END}\nafter`;
const replaced = replaceFence(FENCED, INFLIGHT_START, INFLIGHT_END, "new body");
truthy(replaced, "returns string when fence found");
contains(replaced, "new body", "new content present");
notContains(replaced, "old body", "old content removed");
contains(replaced, "before\n", "preserves before");
contains(replaced, "after", "preserves after");

eq(replaceFence("no fence here", INFLIGHT_START, INFLIGHT_END, "body"), null, "missing fence returns null");
eq(replaceFence(`${INFLIGHT_END}\nbackwards\n${INFLIGHT_START}`, INFLIGHT_START, INFLIGHT_END, "body"), null, "reversed markers return null");

console.log("\nupsertSessionRow");
const EMPTY_SESSIONS = `prefix\n${SESSIONS_START}\n## Sessions\n${SESSIONS_END}\nsuffix`;
const first = upsertSessionRow(EMPTY_SESSIONS, "[pi:aaa]", "- 2026-05-19 [pi:aaa] main — first session");
truthy(first, "adds first row to empty fence");
contains(first, "- 2026-05-19 [pi:aaa] main — first session", "row content present");
contains(first, "## Sessions", "header preserved");

const withOne = first;
const second = upsertSessionRow(withOne, "[pi:bbb]", "- 2026-05-19 [pi:bbb] main — second session");
truthy(second, "adds second row");
const bbbIdx = second.indexOf("[pi:bbb]");
const aaaIdx = second.indexOf("[pi:aaa]");
truthy(bbbIdx < aaaIdx && bbbIdx !== -1, "newest row is first");

// De-dupe: same key returns single row with new content
const dedup = upsertSessionRow(second, "[pi:aaa]", "- 2026-05-19 [pi:aaa] main — UPDATED first session");
const aaaCount = (dedup.match(/\[pi:aaa\]/g) || []).length;
eq(aaaCount, 1, "same key replaces, not duplicates");
contains(dedup, "UPDATED first session", "new content for matched key");
notContains(dedup, "first session — first session", "old content for matched key removed");

// Cap at MAX_SESSION_ROWS
let capTest = EMPTY_SESSIONS;
for (let i = 0; i < MAX_SESSION_ROWS + 3; i++) {
	const id = `id${i.toString().padStart(2, "0")}`;
	capTest = upsertSessionRow(capTest, `[pi:${id}]`, `- 2026-05-19 [pi:${id}] main — row ${i}`);
}
const rowMatches = capTest.match(/^- /gm) || [];
eq(rowMatches.length, MAX_SESSION_ROWS, `caps at ${MAX_SESSION_ROWS} rows`);
contains(capTest, `[pi:id0${MAX_SESSION_ROWS + 2}]`, "newest preserved");
notContains(capTest, "[pi:id00]", "oldest dropped");

// Preserves user note between header and rows
const WITH_NOTE = `${SESSIONS_START}\n## Sessions\n\nUser note here.\n\n- 2026-05-19 [pi:aaa] main — old row\n${SESSIONS_END}`;
const withNote = upsertSessionRow(WITH_NOTE, "[pi:bbb]", "- 2026-05-19 [pi:bbb] main — new row");
truthy(withNote, "handles user note between header and rows");
contains(withNote, "User note here.", "user note preserved");
contains(withNote, "[pi:bbb]", "new row added");

eq(upsertSessionRow("no fence", "[pi:aaa]", "- row"), null, "missing fence returns null");

console.log("\nbootstrapTemplate");
const tpl = bootstrapTemplate("test-repo");
contains(tpl, "# test-repo", "repo name in title");
contains(tpl, INFLIGHT_START, "has in-flight start fence");
contains(tpl, INFLIGHT_END, "has in-flight end fence");
contains(tpl, SESSIONS_START, "has sessions start fence");
contains(tpl, SESSIONS_END, "has sessions end fence");

console.log("\nisGarbageSummary (Pi compaction bug detection)");
eq(isGarbageSummary("(No conversation content was provided to summarize.)"), true, "detects 'no conversation content'");
eq(isGarbageSummary("No conversation messages were provided between the <conversation> tags."), true, "detects 'no conversation messages'");
eq(isGarbageSummary("Build feature X for the team"), false, "real content is not garbage");
eq(isGarbageSummary(""), true, "empty string is garbage");
eq(isGarbageSummary(null), true, "null is garbage");
eq(isGarbageSummary(undefined), true, "undefined is garbage");

console.log("\nextractFirstUserPrompt");
const sampleEntries = [
	{ type: "header" },
	{ type: "message", message: { role: "assistant", content: [{ type: "text", text: "hi" }] } },
	{ type: "message", message: { role: "user", content: "help me refactor the auth module" } },
	{ type: "message", message: { role: "user", content: "second user msg, should not win" } },
];
eq(extractFirstUserPrompt(sampleEntries), "help me refactor the auth module", "finds first user message string content");

const arrayContentEntries = [
	{ type: "message", message: { role: "user", content: [{ type: "text", text: "line one" }, { type: "text", text: "line two" }] } },
];
eq(extractFirstUserPrompt(arrayContentEntries), "line one\nline two", "joins multi-block text content");

eq(extractFirstUserPrompt([]), null, "empty entries returns null");
eq(extractFirstUserPrompt([{ type: "message", message: { role: "assistant", content: "hi" } }]), null, "no user messages returns null");
eq(extractFirstUserPrompt([{ type: "message", message: { role: "user", content: "   " } }]), null, "whitespace-only user message returns null");

console.log("\nrenderFallbackInflight");
const fallback = renderFallbackInflight("Build the new auth flow", META, ["src/auth.ts", "src/auth.test.ts"]);
contains(fallback, "## In flight", "has top-level heading");
contains(fallback, "_Updated 2026-05-19 from pi:a1b2c3d4 on `main`_", "timestamp present");
contains(fallback, "### Goal", "Goal section present");
contains(fallback, "Build the new auth flow", "first prompt as goal");
contains(fallback, "### Modified files", "Modified files section");
contains(fallback, "- src/auth.ts", "first modified file listed");
contains(fallback, "- src/auth.test.ts", "second modified file listed");

const fallbackNoFiles = renderFallbackInflight("Just a question", META, []);
notContains(fallbackNoFiles, "### Modified files", "omits Modified files section when none");

const manyFiles = Array.from({ length: 15 }, (_, i) => `file${i}.ts`);
const fallbackMany = renderFallbackInflight("big change", META, manyFiles);
const rendered = (fallbackMany.match(/^- /gm) || []).length;
truthy(rendered === 11, `caps at 10 files + "and N more" line (got ${rendered})`);
contains(fallbackMany, "and 5 more", "shows overflow count");

console.log("\nextractFenceContent");
const fencedContent = `prefix\n${INFLIGHT_START}\n  hello body  \n${INFLIGHT_END}\nsuffix`;
eq(extractFenceContent(fencedContent, INFLIGHT_START, INFLIGHT_END), "hello body", "extracts trimmed body");
eq(extractFenceContent("no fence here", INFLIGHT_START, INFLIGHT_END), null, "missing fence returns null");
eq(extractFenceContent(`${INFLIGHT_END}\nbackwards\n${INFLIGHT_START}`, INFLIGHT_START, INFLIGHT_END), null, "reversed markers return null");

console.log("\nshortenSessionId (collision-resistant for UUIDv7)");
// Real Pi UUIDv7 ids that collided in the wild: clone + fork sessions started
// in the same ~50-second window shared the first 8 hex chars.
const clonedId = "019e45cc-13e4-7a9f-bf59-ad49e6dc09b9";
const forkedId = "019e45cc-d572-7746-af11-ebb8b4017694";
eq(shortenSessionId(clonedId), "13e47a9f", "clone session takes random middle bits");
eq(shortenSessionId(forkedId), "d5727746", "fork session takes random middle bits");
truthy(shortenSessionId(clonedId) !== shortenSessionId(forkedId), "time-clustered UUIDv7 ids produce distinct short ids");
eq(shortenSessionId("short"), "short", "falls back to slice(0,8) when input too short");
eq(shortenSessionId("abcdefgh-ijkl-mnop"), "ijklmnop", "hyphens stripped before slicing");

console.log("\nfindRowForKey");
const withRows = `${SESSIONS_START}\n## Sessions\n\n- 2026-05-19 [pi:abc12345] main \u2014 first row\n- 2026-05-19 [pi:def67890] main \u2014 second row\n${SESSIONS_END}`;
truthy(findRowForKey(withRows, "[pi:abc12345]")?.includes("first row"), "finds matching row");
eq(findRowForKey(withRows, "[pi:zzzzzzzz]"), null, "missing key returns null");
eq(findRowForKey("no fence here", "[pi:abc12345]"), null, "missing fence returns null");

// ---------------------------------------------------------------------------
// v0.2: entry-based fallback (renders without an LLM, robust to pi#4811)
// ---------------------------------------------------------------------------

console.log("\nisLowSignalPrompt");
eq(isLowSignalPrompt("what's next?"), true, "detects what's next");
eq(isLowSignalPrompt("what's next for this project?"), true, "detects what's next for this project");
eq(isLowSignalPrompt("What Should I Do Next?"), true, "case insensitive");
eq(isLowSignalPrompt("ok"), true, "detects ok");
eq(isLowSignalPrompt("continue"), true, "detects continue");
eq(isLowSignalPrompt("go on"), true, "detects go on");
eq(isLowSignalPrompt("yes"), true, "detects yes");
eq(isLowSignalPrompt("hi"), true, "detects greeting");
eq(isLowSignalPrompt("hello"), true, "detects hello");
eq(isLowSignalPrompt("short"), true, "length < 8 is low-signal");
eq(isLowSignalPrompt("refactor the auth module"), false, "real prompt is not low-signal");
eq(isLowSignalPrompt("investigate why BETTER_AUTH_URL defaults to wrong domain"), false, "substantive prompt passes");

console.log("\nsummarizeSessionEntries");

// Synthetic session matching real Pi JSONL shape
const syntheticSession = [
	{ type: "session", id: "..." },
	{
		type: "message",
		message: { role: "user", content: [{ type: "text", text: "what's next?" }] },
	},
	{
		type: "message",
		message: { role: "assistant", content: [{ type: "text", text: "Here's what's queued up..." }] },
	},
	{
		type: "message",
		message: { role: "user", content: [{ type: "text", text: "refactor the auth module to support multi-tenant" }] },
	},
	{
		type: "message",
		message: {
			role: "assistant",
			content: [
				{ type: "toolCall", name: "read", arguments: { path: "/repo/src/auth.ts" } },
				{ type: "toolCall", name: "edit", arguments: { path: "/repo/src/auth.ts" } },
				{ type: "toolCall", name: "write", arguments: { path: "/repo/src/auth-tenant.ts" } },
				{ type: "toolCall", name: "edit", arguments: { path: "/repo/src/auth-tenant.ts" } },
				{ type: "toolCall", name: "bash", arguments: { command: "npm test" } },
				{ type: "toolCall", name: "bash", arguments: { command: "npm test" } },
			],
		},
	},
	{
		type: "message",
		message: { role: "user", content: [{ type: "text", text: "ship the PR" }] },
	},
	{
		type: "message",
		message: {
			role: "assistant",
			content: [{ type: "text", text: "PR #1234 opened: feat(auth): multi-tenant support" }],
		},
	},
];

const rollup = summarizeSessionEntries(syntheticSession);
eq(rollup.goal, "refactor the auth module to support multi-tenant", "goal skips low-signal first prompt");
eq(rollup.recentDirection, "ship the PR", "recentDirection picks most recent non-trivial that isn't goal");
eq(rollup.edited.length, 1, "only edits on non-written files remain");
eq(rollup.edited[0], "/repo/src/auth.ts", "edited-only file retained");
eq(rollup.written.length, 1, "one file written");
eq(rollup.written[0], "/repo/src/auth-tenant.ts", "correct written path");
eq(rollup.bashCount, 2, "bash count");
eq(rollup.readCount, 1, "read count");
eq(rollup.lastAssistantText, "PR #1234 opened: feat(auth): multi-tenant support", "last assistant text captured");
eq(rollup.promptCount, 3, "prompt count");
eq(rollup.messageCount, 6, "message count (excludes session header)");

const onlyLowSignalSession = [
	{ type: "message", message: { role: "user", content: [{ type: "text", text: "what's next?" }] } },
	{ type: "message", message: { role: "user", content: [{ type: "text", text: "ok" }] } },
];
const onlyLow = summarizeSessionEntries(onlyLowSignalSession);
eq(onlyLow.goal, "what's next?", "falls back to first prompt when all are low-signal");
eq(onlyLow.recentDirection, null, "no recentDirection when all are low-signal");

const emptySession = summarizeSessionEntries([]);
eq(emptySession.goal, null, "empty session has null goal");
eq(emptySession.edited.length, 0, "empty session has no edits");
eq(emptySession.lastAssistantText, null, "empty session has no assistant text");

// Clipboard-paste filter (Pi inserts /var/folders/.../*.png paths as user msgs)
const clipboardSession = [
	{
		type: "message",
		message: {
			role: "user",
			content: [{ type: "text", text: "/var/folders/1s/abc/T/pi-clipboard-xyz.png" }],
		},
	},
	{
		type: "message",
		message: { role: "user", content: [{ type: "text", text: "investigate this prod incident" }] },
	},
];
const clip = summarizeSessionEntries(clipboardSession);
eq(clip.goal, "investigate this prod incident", "clipboard-paste content excluded from prompts");
eq(clip.promptCount, 1, "clipboard prompt not counted");

// /tmp/ and /var/ paths filtered from edited/written
const tmpSession = [
	{
		type: "message",
		message: {
			role: "assistant",
			content: [
				{ type: "toolCall", name: "write", arguments: { path: "/tmp/pr-body.md" } },
				{ type: "toolCall", name: "write", arguments: { path: "/var/folders/x/y.txt" } },
				{ type: "toolCall", name: "write", arguments: { path: "/repo/real.ts" } },
			],
		},
	},
];
const tmpRollup = summarizeSessionEntries(tmpSession);
eq(tmpRollup.written.length, 1, "only real path counted (tmp/var filtered)");
eq(tmpRollup.written[0], "/repo/real.ts", "correct real path retained");

console.log("\nhasEnoughSignal");
eq(hasEnoughSignal(rollup), true, "substantive rollup has enough signal");
eq(hasEnoughSignal(emptySession), false, "empty rollup has insufficient signal");
eq(hasEnoughSignal(onlyLow), false, "only-low-signal rollup has insufficient signal");
eq(
	hasEnoughSignal({
		goal: "what's next?",
		recentDirection: null,
		edited: [],
		written: [],
		bashCount: 5,
		readCount: 10,
		lastAssistantText: "some text",
		promptCount: 1,
		messageCount: 10,
	}),
	true,
	"low-signal goal but >=3 tool events passes",
);
eq(
	hasEnoughSignal({
		goal: "what's next?",
		recentDirection: null,
		edited: [],
		written: [],
		bashCount: 2,
		readCount: 5,
		lastAssistantText: "some text",
		promptCount: 1,
		messageCount: 5,
	}),
	false,
	"low-signal goal AND <3 tool events bails",
);

console.log("\nrollupOneLiner");
eq(rollupOneLiner(rollup), "refactor the auth module to support multi-tenant", "goal becomes one-liner");
eq(rollupOneLiner(onlyLow), null, "low-signal goal returns null (don't pollute sessions cap)");
eq(rollupOneLiner(emptySession), null, "empty rollup returns null");

// First-sentence trimming on a long multi-sentence prompt
const longGoalRollup = summarizeSessionEntries([
	{
		type: "message",
		message: {
			role: "user",
			content: [{ type: "text", text: "investigate the BETTER_AUTH_URL bug. it's affecting prod traffic." }],
		},
	},
]);
eq(
	rollupOneLiner(longGoalRollup),
	"investigate the BETTER_AUTH_URL bug.",
	"trims to first sentence",
);

console.log("\nrenderFallbackInflightFromEntries");
const renderedRollup = renderFallbackInflightFromEntries(rollup, META, ["src/auth.ts"], "/repo");
contains(renderedRollup, "## In flight", "has top-level heading");
contains(renderedRollup, "_Updated 2026-05-19 from pi:a1b2c3d4 on `main`_", "timestamp line");
contains(renderedRollup, "### Goal", "Goal section");
contains(renderedRollup, "refactor the auth module to support multi-tenant", "goal text");
contains(renderedRollup, "### Recent direction", "Recent direction section");
contains(renderedRollup, "ship the PR", "recent direction text");
contains(renderedRollup, "### Done", "Done section");
contains(renderedRollup, "- Wrote `src/auth-tenant.ts`", "written file with cwd-relative path");
notContains(renderedRollup, "- Edited `src/auth-tenant.ts`", "no duplicate edit row for written file");
contains(renderedRollup, "- Ran 2 shell commands, read 1 file", "shell + read summary");
contains(renderedRollup, "### Where we left off", "Where we left off section");
contains(renderedRollup, "PR #1234 opened", "last assistant text surfaced");
contains(renderedRollup, "### Uncommitted", "Uncommitted section when modifiedFiles present");
contains(renderedRollup, "- `src/auth.ts`", "uncommitted file listed");

const renderedEmpty = renderFallbackInflightFromEntries(emptySession, META, [], "/repo");
contains(renderedEmpty, "Resumed session on `main`", "empty rollup uses generic goal text");
notContains(renderedEmpty, "### Done", "no Done section when no activity");
notContains(renderedEmpty, "### Where we left off", "no Where we left off when no assistant text");
notContains(renderedEmpty, "### Uncommitted", "no Uncommitted when no modified files");

const renderedLowGoal = renderFallbackInflightFromEntries(
	{
		goal: "what's next?",
		recentDirection: null,
		edited: ["/repo/x.ts"],
		written: [],
		bashCount: 5,
		readCount: 0,
		lastAssistantText: null,
		promptCount: 1,
		messageCount: 5,
	},
	META,
	[],
	"/repo",
);
contains(renderedLowGoal, "Resumed session on `main`", "low-signal goal swapped for generic");
notContains(renderedLowGoal, "what's next?", "low-signal goal text not surfaced");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
