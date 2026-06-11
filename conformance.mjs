#!/usr/bin/env node
/**
 * Cross-producer conformance harness.
 *
 * Bonfire's headline invariant (AGENTS.md, "Key invariants"): every producer
 * emits BYTE-IDENTICAL fence shapes. Two adapters write to the same committed
 * `.bonfire/index.md` on alternating sessions, so "the rows parse" is not
 * enough — the bytes must match or the adapters churn each other's output.
 *
 * The three producers:
 *   1. Pi adapter        — pi/lib.ts            (TS, exported)
 *   2. Claude adapter    — claude/lib.mjs       (JS, exported)
 *   3. Fallback skill    — skills/bonfire/...   (prose, not executable)
 *
 * This harness asserts:
 *   A. Constant parity between the two code producers.
 *   B. Byte-identical output from the shared primitives (the real guarantee).
 *   C. A single canonical grammar for the in-flight header + sessions row,
 *      and that the code producers' construction sites match it.
 *   D. The prose producer (the skill + bootstrap templates) documents that
 *      same grammar — the only way to cover a producer that can't be run.
 *
 * NON-GOAL: the in-flight *body* is intentionally divergent across producers
 * (Pi structured Goal/Progress/Next vs Claude `Working on:` vs the skill's
 * own shape). This harness never asserts in-flight-body equality — only the
 * shared mechanics: fences, header grammar, row grammar, dedupe, cap.
 *
 * Run from repo root:
 *   tsx conformance.mjs
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import * as pi from "./pi/lib.ts";
import * as cl from "./claude/lib.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let passed = 0;
let failed = 0;

function assert(cond, name, detail) {
	if (cond) {
		console.log(`  \u2713 ${name}`);
		passed++;
	} else {
		console.error(`  \u2717 ${name}`);
		if (detail) console.error(`    ${detail}`);
		failed++;
	}
}

/** Assert two producers return the same value (strings, primitives, or null). */
function eq(name, a, b) {
	const same = a === b;
	assert(same, name, same ? undefined : `pi=${JSON.stringify(a)}\n    cl=${JSON.stringify(b)}`);
}

// The em-dash separator that joins <branch> and <one-liner> in a sessions
// row. Pinned here so a stray hyphen in any producer is caught.
const EMDASH = "\u2014";

// --- Canonical grammar. This is the single source of truth the code
// producers are measured against AND that the prose skill must document.
const ROW_RE = new RegExp(`^- \\d{4}-\\d{2}-\\d{2} \\[[a-z]+:[a-f0-9]{8,}\\] .+ ${EMDASH} .+$`, "u");
const HEADER_RE = /^_Updated \d{4}-\d{2}-\d{2} from [a-z]+:[a-f0-9]{8,} on `.+`_$/u;

// Canonical templates exactly as the fallback skill documents them. Kept here
// so a code-side grammar change forces a matching prose change (group D ties
// these to ROW_RE / HEADER_RE).
const CANON_ROW_TEMPLATE = `- YYYY-MM-DD [<host>:<short-session-id>] <branch> ${EMDASH} <one-line headline>`;
const CANON_HEADER_TEMPLATE = "_Updated YYYY-MM-DD from <host>:<short-session-id> on `<branch>`_";

function fillTemplate(t) {
	return t
		.replace(/YYYY-MM-DD/g, "2026-06-11")
		.replace(/<host>/g, "pi")
		.replace(/<short-session-id>/g, "02927b12")
		.replace(/<branch>/g, "main")
		.replace(/<one-line headline>/g, "ship the cross-producer harness");
}

/** Build a minimal index.md body with the given sessions rows. */
function makeIndex(rows) {
	return [
		"# fixture-repo",
		"",
		pi.INFLIGHT_START,
		"## In flight",
		"",
		"placeholder",
		pi.INFLIGHT_END,
		"",
		pi.SESSIONS_START,
		"## Sessions",
		"",
		...rows,
		pi.SESSIONS_END,
		"",
	].join("\n");
}

// ===========================================================================
console.log("\nconformance: A. constant parity (pi/lib.ts vs claude/lib.mjs)");

eq("INFLIGHT_START", pi.INFLIGHT_START, cl.INFLIGHT_START);
eq("INFLIGHT_END", pi.INFLIGHT_END, cl.INFLIGHT_END);
eq("SESSIONS_START", pi.SESSIONS_START, cl.SESSIONS_START);
eq("SESSIONS_END", pi.SESSIONS_END, cl.SESSIONS_END);
eq("MAX_SESSION_ROWS", pi.MAX_SESSION_ROWS, cl.MAX_SESSION_ROWS);
eq("ONE_LINER_MAX", pi.ONE_LINER_MAX, cl.ONE_LINER_MAX);

// ===========================================================================
console.log("\nconformance: B. byte-identical primitive output");

// shortenSessionId — UUIDv7-like (skip timestamp prefix), UUIDv4, and short.
for (const uuid of [
	"019e463b-0292-7b12-893a-1af8b99f4607",
	"aabbccdd-eeff-1234-5678-9abcdef01234",
	"11111111-2222-3333-4444-555555555555",
	"abcd1234",
]) {
	eq(`shortenSessionId(${uuid})`, pi.shortenSessionId(uuid), cl.shortenSessionId(uuid));
}

// truncate — under, exactly at, and over the limit (ellipsis path).
for (const [s, max] of [
	["short", 200],
	["exactly", 7],
	["toolong", 5],
	["x".repeat(250), pi.ONE_LINER_MAX],
]) {
	eq(`truncate(len=${s.length}, max=${max})`, pi.truncate(s, max), cl.truncate(s, max));
}

// replaceFence — happy path, missing fence, inverted markers.
{
	const base = makeIndex(["- 2026-06-01 [pi:02927b12] main " + EMDASH + " seed"]);
	const body = "\n## In flight\n\nupdated body\n";
	eq(
		"replaceFence(inflight)",
		pi.replaceFence(base, pi.INFLIGHT_START, pi.INFLIGHT_END, body),
		cl.replaceFence(base, cl.INFLIGHT_START, cl.INFLIGHT_END, body),
	);
	eq(
		"replaceFence(missing fence) -> null",
		pi.replaceFence("no fences here", pi.INFLIGHT_START, pi.INFLIGHT_END, body),
		cl.replaceFence("no fences here", cl.INFLIGHT_START, cl.INFLIGHT_END, body),
	);
}

// upsertSessionRow — insert, dedupe-by-key, cap-at-5, header preservation,
// missing fence.
{
	const empty = makeIndex([]);
	const row = `- 2026-06-11 [pi:02927b12] main ${EMDASH} insert me`;
	eq(
		"upsertSessionRow(insert into empty)",
		pi.upsertSessionRow(empty, "[pi:02927b12]", row),
		cl.upsertSessionRow(empty, "[pi:02927b12]", row),
	);

	const withDup = makeIndex([
		`- 2026-06-01 [pi:02927b12] main ${EMDASH} old version`,
		`- 2026-05-30 [claude:deadbeef] main ${EMDASH} other`,
	]);
	const updated = `- 2026-06-11 [pi:02927b12] main ${EMDASH} new version`;
	eq(
		"upsertSessionRow(dedupe by key)",
		pi.upsertSessionRow(withDup, "[pi:02927b12]", updated),
		cl.upsertSessionRow(withDup, "[pi:02927b12]", updated),
	);

	const sixRows = Array.from(
		{ length: 6 },
		(_, i) => `- 2026-06-0${i + 1} [pi:0000000${i}] main ${EMDASH} row ${i}`,
	);
	const capContent = makeIndex(sixRows);
	const newRow = `- 2026-06-11 [pi:abcdef01] main ${EMDASH} newest`;
	const piCap = pi.upsertSessionRow(capContent, "[pi:abcdef01]", newRow);
	const clCap = cl.upsertSessionRow(capContent, "[pi:abcdef01]", newRow);
	eq("upsertSessionRow(cap at 5)", piCap, clCap);
	assert(
		piCap !== null && (piCap.match(/^- /gm) || []).length === pi.MAX_SESSION_ROWS,
		"cap actually trims to MAX_SESSION_ROWS rows",
		piCap === null ? "null output" : `got ${(piCap.match(/^- /gm) || []).length} rows`,
	);

	// Header preservation: custom prose between the start marker and rows.
	const withHeader = [
		pi.SESSIONS_START,
		"## Sessions",
		"",
		"Newest first. Older sessions roll into log.md.",
		"",
		`- 2026-06-01 [pi:02927b12] main ${EMDASH} seed`,
		pi.SESSIONS_END,
	].join("\n");
	eq(
		"upsertSessionRow(preserve header prose)",
		pi.upsertSessionRow(withHeader, "[pi:99999999]", `- 2026-06-11 [pi:99999999] main ${EMDASH} add`),
		cl.upsertSessionRow(withHeader, "[pi:99999999]", `- 2026-06-11 [pi:99999999] main ${EMDASH} add`),
	);

	eq(
		"upsertSessionRow(missing fence) -> null",
		pi.upsertSessionRow("no fences", "[pi:x]", "- row"),
		cl.upsertSessionRow("no fences", "[pi:x]", "- row"),
	);
}

// ===========================================================================
console.log("\nconformance: C. code producers match the canonical grammar");

// Header: drive the REAL Pi renderers and check the emitted attribution line.
{
	const meta = { date: "2026-06-11", host: "pi", shortId: "02927b12", branch: "main" };
	const summary = "## Goal\nship the cross-producer harness\n\n## Next Steps\n- land it";
	const block = pi.renderInflight(summary, meta);
	const headerLine = (block || "").split("\n").find((l) => l.startsWith("_Updated"));
	assert(!!headerLine, "pi.renderInflight emits an _Updated header line");
	assert(HEADER_RE.test(headerLine || ""), "pi.renderInflight header matches HEADER_RE", headerLine);

	const rollup = pi.summarizeSessionEntries([
		{ type: "message", message: { role: "user", content: [{ type: "text", text: "ship the harness today" }] } },
		{
			type: "message",
			message: {
				role: "assistant",
				content: [
					{ type: "toolCall", name: "write", arguments: { path: "/repo/conformance.mjs" } },
					{ type: "toolCall", name: "bash", arguments: { command: "tsx conformance.mjs" } },
				],
			},
		},
	]);
	const fb = pi.renderFallbackInflightFromEntries(rollup, meta, [], "/repo");
	const fbHeader = fb.split("\n").find((l) => l.startsWith("_Updated"));
	assert(HEADER_RE.test(fbHeader || ""), "pi.renderFallbackInflightFromEntries header matches HEADER_RE", fbHeader);
}

// Row: reconstruct exactly as both adapters' construction sites do
// (pi/extension.ts:314, claude/update-bonfire.mjs), using the shared
// primitives, and assert the canonical grammar.
{
	const date = "2026-06-11";
	const shortId = pi.shortenSessionId("019e463b-0292-7b12-893a-1af8b99f4607");
	for (const host of ["pi", "claude"]) {
		const oneLiner = pi.truncate("ship the cross-producer harness", pi.ONE_LINER_MAX);
		const row = `- ${date} [${host}:${shortId}] main ${EMDASH} ${oneLiner}`;
		assert(ROW_RE.test(row), `${host} sessions row matches ROW_RE`, row);
	}
}

// Source-signature lint: the construction sites must use the canonical
// skeleton. Normalizes ${...} interpolations to a sentinel so the structural
// shape is compared, not the variable names (which differ across producers).
{
	// Normalize escaped backticks (\`) — the header lives inside a backtick
	// template literal, so its branch backticks are escaped in source — then
	// collapse ${...} interpolations to a sentinel to compare structure only.
	const skel = (s) => s.replace(/\\`/g, "`").replace(/\$\{[^}]*\}/g, "\u00a7");
	const ROW_SKELETON = `- \u00a7 [\u00a7:\u00a7] \u00a7 ${EMDASH} \u00a7`;
	const HEADER_SKELETON = "_Updated \u00a7 from \u00a7:\u00a7 on `\u00a7`_";

	const piExt = fs.readFileSync(path.join(__dirname, "pi", "extension.ts"), "utf8");
	const piLib = fs.readFileSync(path.join(__dirname, "pi", "lib.ts"), "utf8");
	const clHook = fs.readFileSync(path.join(__dirname, "claude", "update-bonfire.mjs"), "utf8");

	assert(skel(piExt).includes(ROW_SKELETON), "pi/extension.ts row construction matches canonical skeleton");
	assert(skel(clHook).includes(ROW_SKELETON), "claude/update-bonfire.mjs row construction matches canonical skeleton");
	assert(skel(piLib).includes(HEADER_SKELETON), "pi/lib.ts header construction matches canonical skeleton");
	assert(skel(clHook).includes(HEADER_SKELETON), "claude/update-bonfire.mjs header construction matches canonical skeleton");
}

// ===========================================================================
console.log("\nconformance: D. prose producer (skill + templates) documents the grammar");

{
	// Self-check: the canonical templates fill to canonical grammar. This is
	// the link that makes a ROW_RE/HEADER_RE change ripple into the prose.
	assert(ROW_RE.test(fillTemplate(CANON_ROW_TEMPLATE)), "filled CANON_ROW_TEMPLATE matches ROW_RE", fillTemplate(CANON_ROW_TEMPLATE));
	assert(HEADER_RE.test(fillTemplate(CANON_HEADER_TEMPLATE)), "filled CANON_HEADER_TEMPLATE matches HEADER_RE", fillTemplate(CANON_HEADER_TEMPLATE));

	const endMd = fs.readFileSync(path.join(__dirname, "skills", "bonfire", "commands", "end.md"), "utf8");
	// end.md writes the header inside a markdown code span with an escaped
	// backtick (\`). Normalize that away before comparing to the template.
	const endNorm = endMd.replace(/\\`/g, "`");
	assert(endNorm.includes(CANON_ROW_TEMPLATE), "end.md documents the canonical row template");
	assert(endNorm.includes(CANON_HEADER_TEMPLATE), "end.md documents the canonical header template");

	// Fence markers must be consistent everywhere a producer bootstraps a file.
	// The skill template and pi.bootstrapTemplate() emit literal markers; the
	// claude bootstrap interpolates the imported constants (post-extraction),
	// so we verify it references all four constant names instead.
	const tmpl = fs.readFileSync(path.join(__dirname, "skills", "bonfire", "templates", "index.md"), "utf8");
	const piBootstrap = pi.bootstrapTemplate("x");
	for (const [label, text] of [
		["skills/bonfire/templates/index.md", tmpl],
		["pi.bootstrapTemplate()", piBootstrap],
	]) {
		const hasAll =
			text.includes(pi.INFLIGHT_START) &&
			text.includes(pi.INFLIGHT_END) &&
			text.includes(pi.SESSIONS_START) &&
			text.includes(pi.SESSIONS_END);
		assert(hasAll, `${label} contains all four fence markers`);
	}

	const clHook = fs.readFileSync(path.join(__dirname, "claude", "update-bonfire.mjs"), "utf8");
	const refsAll = ["INFLIGHT_START", "INFLIGHT_END", "SESSIONS_START", "SESSIONS_END"].every((c) =>
		clHook.includes("${" + c + "}"),
	);
	assert(refsAll, "claude bootstrap template interpolates all four fence-marker constants");
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
