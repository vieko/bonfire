/**
 * Pure functions used by extension.ts. Exported separately so they can be
 * unit-tested without booting a real Pi extension runtime.
 */

export const INFLIGHT_START = "<!-- bonfire:auto-inflight:start v1 -->";
export const INFLIGHT_END = "<!-- bonfire:auto-inflight:end -->";
export const SESSIONS_START = "<!-- bonfire:auto-sessions:start v1 -->";
export const SESSIONS_END = "<!-- bonfire:auto-sessions:end -->";
export const MAX_SESSION_ROWS = 5;
export const ONE_LINER_MAX = 200;

export interface InflightMeta {
	date: string;
	host: string;
	shortId: string;
	branch: string;
}

/**
 * Build a collision-resistant short id from a session UUID.
 *
 * Pi uses UUIDv7 ids whose first 8 hex chars (32 bits) encode the timestamp
 * prefix. Sessions started in the same time window share those bits, so
 * `slice(0,8)` collides for time-clustered sessions. Chars 8–16 of the
 * hyphen-stripped UUID skip the time prefix and are random for both UUIDv7
 * and UUIDv4, giving 32 bits of entropy and ≈10⁻⁹ collision odds per repo.
 */
export function shortenSessionId(uuid: string): string {
	const noHyphens = uuid.replace(/-/g, "");
	return noHyphens.length >= 16 ? noHyphens.slice(8, 16) : noHyphens.slice(0, 8);
}

/**
 * Extract a one-line headline from a Pi-style compaction summary.
 * Prefers the first content line under `## Goal`; falls back to first
 * non-blank, non-header line. Truncated with ellipsis at ONE_LINER_MAX.
 */
export function extractOneLiner(summary: string): string | null {
	const goal = extractSection(summary, "Goal");
	if (goal) {
		const first = goal.split("\n").find((l) => l.trim());
		if (first) return truncate(stripListMarker(first), ONE_LINER_MAX);
	}
	const fallback = summary.split("\n").find((l) => l.trim() && !l.startsWith("#"));
	if (fallback) return truncate(stripListMarker(fallback), ONE_LINER_MAX);
	return null;
}

/**
 * Build the in-flight block body from Pi's structured summary.
 * Returns null when the summary has no usable forward-looking content
 * (caller should leave the existing block alone in that case).
 */
export function renderInflight(summary: string, meta: InflightMeta): string | null {
	const goal = extractSection(summary, "Goal");
	const nextSteps = extractSection(summary, "Next Steps");
	const inProgress = extractSubsection(summary, "Progress", "In Progress");
	const blocked = extractSubsection(summary, "Progress", "Blocked");

	if (!goal && !nextSteps && !inProgress && !blocked) return null;

	const lines: string[] = [];
	lines.push("");
	lines.push("## In flight");
	lines.push("");
	lines.push(`_Updated ${meta.date} from ${meta.host}:${meta.shortId} on \`${meta.branch}\`_`);
	lines.push("");

	if (goal) {
		lines.push("### Goal");
		lines.push(goal);
		lines.push("");
	}
	if (inProgress) {
		lines.push("### In Progress");
		lines.push(inProgress);
		lines.push("");
	}
	if (blocked) {
		lines.push("### Blocked");
		lines.push(blocked);
		lines.push("");
	}
	if (nextSteps) {
		lines.push("### Next Steps");
		lines.push(nextSteps);
		lines.push("");
	}

	return lines.join("\n");
}

/**
 * Extract content of a top-level `## <name>` section, stopping at the next
 * `## ` heading or end of input. Returns trimmed body or null.
 */
export function extractSection(summary: string, name: string): string | null {
	const lines = summary.split("\n");
	const out: string[] = [];
	let inSection = false;
	const headerRe = new RegExp(`^##\\s+${escapeRegExp(name)}\\b`, "i");
	for (const line of lines) {
		if (headerRe.test(line)) {
			inSection = true;
			continue;
		}
		if (inSection && /^##\s/.test(line)) break;
		if (inSection) out.push(line);
	}
	const body = out.join("\n").trim();
	return body || null;
}

/**
 * Extract `### <sub>` inside `## <parent>`.
 */
export function extractSubsection(summary: string, parent: string, sub: string): string | null {
	const parentBody = extractSection(summary, parent);
	if (!parentBody) return null;
	const lines = parentBody.split("\n");
	const out: string[] = [];
	let inSub = false;
	const headerRe = new RegExp(`^###\\s+${escapeRegExp(sub)}\\b`, "i");
	for (const line of lines) {
		if (headerRe.test(line)) {
			inSub = true;
			continue;
		}
		if (inSub && /^###\s/.test(line)) break;
		if (inSub) out.push(line);
	}
	const body = out.join("\n").trim();
	return body || null;
}

/**
 * Replace the content between fence markers. Returns updated content, or
 * null if the fence is missing/malformed.
 */
export function replaceFence(
	content: string,
	startMarker: string,
	endMarker: string,
	body: string,
): string | null {
	const startIdx = content.indexOf(startMarker);
	const endIdx = content.indexOf(endMarker);
	if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) return null;
	const before = content.slice(0, startIdx + startMarker.length);
	const after = content.slice(endIdx);
	return `${before}\n${body.trimEnd()}\n${after}`;
}

/**
 * Insert or replace a Sessions row keyed by `keyToken` (e.g. "[pi:a1b2c3d4]").
 * Maintains MAX_SESSION_ROWS cap, newest first. Returns null if the
 * sessions fence is missing/malformed. Preserves any header content
 * between the start marker and the first row.
 */
export function upsertSessionRow(content: string, keyToken: string, row: string): string | null {
	const startIdx = content.indexOf(SESSIONS_START);
	const endIdx = content.indexOf(SESSIONS_END);
	if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) return null;

	const before = content.slice(0, startIdx + SESSIONS_START.length);
	const after = content.slice(endIdx);
	const block = content.slice(startIdx + SESSIONS_START.length, endIdx);

	const blockLines = block.split("\n").map((l) => l.replace(/\s+$/, ""));
	const headerLines: string[] = [];
	const rowLines: string[] = [];
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

export function bootstrapTemplate(repoName: string): string {
	return `# ${repoName}

${INFLIGHT_START}
## In flight

_No session has compacted in this repo yet. Run Pi until \`/compact\` fires (auto or manual) and this section will populate from the structured summary._
${INFLIGHT_END}

${SESSIONS_START}
## Sessions
${SESSIONS_END}
`;
}

function escapeRegExp(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripListMarker(line: string): string {
	return line.replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, "").trim();
}

export function truncate(s: string, max: number): string {
	if (s.length <= max) return s;
	return s.slice(0, max - 1) + "…";
}

/**
 * Detect Pi compaction bug output. The broken pipeline produces summaries
 * whose Goal section says variations of "no conversation content was
 * provided to summarize" because Pi sent the LLM empty <conversation> tags.
 * Used by the session_shutdown handler to know when to overwrite with the
 * first-user-prompt fallback.
 */
export function isGarbageSummary(text: string | null | undefined): boolean {
	if (!text) return true;
	return /no conversation (content|messages?)/i.test(text);
}

/**
 * Find the first user message in a session's entries and return its text.
 * Returns null when no usable user text exists (empty session or non-text-only
 * content). Walks entries.message.content which is the AssistantMessage-shaped
 * payload stored under each SessionEntry wrapper.
 */
export function extractFirstUserPrompt(entries: readonly any[]): string | null {
	for (const entry of entries) {
		if (entry?.type !== "message") continue;
		if (entry.message?.role !== "user") continue;
		const content = entry.message.content;
		if (typeof content === "string") {
			const trimmed = content.trim();
			if (trimmed) return trimmed;
		}
		if (Array.isArray(content)) {
			const text = content
				.filter((c: any) => c?.type === "text" && typeof c.text === "string")
				.map((c: any) => c.text as string)
				.join("\n")
				.trim();
			if (text) return text;
		}
	}
	return null;
}

/**
 * Build the in-flight body for the fallback path (no structured Pi summary
 * available). Uses Goal + Modified files sections so it slots into the same
 * mental model as Pi's structured compaction output, just with degraded data.
 */
export function renderFallbackInflight(
	prompt: string,
	meta: InflightMeta,
	modifiedFiles: readonly string[],
): string {
	const lines: string[] = [];
	lines.push("");
	lines.push("## In flight");
	lines.push("");
	lines.push(`_Updated ${meta.date} from ${meta.host}:${meta.shortId} on \`${meta.branch}\`_`);
	lines.push("");
	lines.push("### Goal");
	lines.push(truncate(prompt, ONE_LINER_MAX * 2));
	lines.push("");
	if (modifiedFiles.length > 0) {
		lines.push("### Modified files");
		for (const f of modifiedFiles.slice(0, 10)) {
			lines.push(`- ${f}`);
		}
		if (modifiedFiles.length > 10) {
			lines.push(`- _(…and ${modifiedFiles.length - 10} more)_`);
		}
		lines.push("");
	}
	return lines.join("\n");
}

/**
 * Read the content between two fence markers without modifying anything.
 * Returns null when fences are missing/malformed.
 */
export function extractFenceContent(
	content: string,
	startMarker: string,
	endMarker: string,
): string | null {
	const startIdx = content.indexOf(startMarker);
	const endIdx = content.indexOf(endMarker);
	if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) return null;
	return content.slice(startIdx + startMarker.length, endIdx).trim();
}

/**
 * Locate an existing Sessions row whose text contains the given token (e.g.
 * "[pi:abc12345]"). Returns the row text or null when no match.
 */
export function findRowForKey(content: string, keyToken: string): string | null {
	const startIdx = content.indexOf(SESSIONS_START);
	const endIdx = content.indexOf(SESSIONS_END);
	if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) return null;
	const block = content.slice(startIdx + SESSIONS_START.length, endIdx);
	const lines = block
		.split("\n")
		.map((l) => l.trim())
		.filter((l) => l.startsWith("- "));
	return lines.find((r) => r.includes(keyToken)) || null;
}
