/**
 * Shared fence-contract primitives for the Claude Code adapter.
 *
 * These are extracted so the cross-producer conformance harness
 * (`../conformance.mjs`) can import them WITHOUT executing the Stop hook —
 * `update-bonfire.mjs` runs `main()` on import, so its internals were
 * previously untestable in isolation.
 *
 * Every export here MUST stay byte-for-byte behaviorally identical to its
 * counterpart in `../pi/lib.ts`. That equivalence is the contract the
 * conformance harness enforces. See `../AGENTS.md` ("Fence-contract sync
 * contract") before editing.
 */

export const INFLIGHT_START = "<!-- bonfire:auto-inflight:start v1 -->";
export const INFLIGHT_END = "<!-- bonfire:auto-inflight:end -->";
export const SESSIONS_START = "<!-- bonfire:auto-sessions:start v1 -->";
export const SESSIONS_END = "<!-- bonfire:auto-sessions:end -->";
export const MAX_SESSION_ROWS = 5;
export const ONE_LINER_MAX = 200;

/**
 * Build a collision-resistant short id from a session UUID. Skips the first
 * 8 hex chars (the UUIDv7 timestamp prefix, which collides for sessions
 * started in the same window) and uses the random middle bits. Works for
 * UUIDv4 too since those bits are also random.
 */
export function shortenSessionId(uuid) {
	const noHyphens = uuid.replace(/-/g, "");
	return noHyphens.length >= 16 ? noHyphens.slice(8, 16) : noHyphens.slice(0, 8);
}

export function replaceFence(content, startMarker, endMarker, body) {
	const startIdx = content.indexOf(startMarker);
	const endIdx = content.indexOf(endMarker);
	if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) return null;
	const before = content.slice(0, startIdx + startMarker.length);
	const after = content.slice(endIdx);
	return `${before}\n${body.trimEnd()}\n${after}`;
}

export function upsertSessionRow(content, keyToken, row) {
	const startIdx = content.indexOf(SESSIONS_START);
	const endIdx = content.indexOf(SESSIONS_END);
	if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) return null;

	const before = content.slice(0, startIdx + SESSIONS_START.length);
	const after = content.slice(endIdx);
	const block = content.slice(startIdx + SESSIONS_START.length, endIdx);

	const blockLines = block.split("\n").map((l) => l.replace(/\s+$/, ""));
	const headerLines = [];
	const rowLines = [];
	let sawRow = false;
	for (const line of blockLines) {
		if (!sawRow && line.startsWith("- ")) sawRow = true;
		if (sawRow) {
			if (line.startsWith("- ")) rowLines.push(line);
		} else {
			headerLines.push(line);
		}
	}

	const filtered = rowLines.filter((r) => !r.includes(keyToken));
	const newRows = [row, ...filtered].slice(0, MAX_SESSION_ROWS);

	const header = headerLines.join("\n").trim() || "## Sessions";
	const body = `\n${header}\n\n${newRows.join("\n")}\n`;

	return `${before}${body}${after}`;
}

export function truncate(s, max) {
	if (s.length <= max) return s;
	return s.slice(0, max - 1) + "…";
}
