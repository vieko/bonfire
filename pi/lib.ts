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

/**
 * Pi-style status footer glyph for the bonfire slot. White triangle reads as
 * flame silhouette in monospace, renders in every font, is not an emoji.
 * State follows a compact vocabulary modeled on Pi's own labels
 * (↑45 ↓26k R1.3M W107k $1.959 7.7%/1.0M (auto)) — single sigil + value, no
 * English in the slot since the slot name already namespaces it.
 *
 * Sigils:
 *   !  warning — something detected that the user should know
 *   ?  nudge   — action the user could take, optional
 *   +  result  — the adapter just wrote something
 *
 * Letters: I = In-flight, S = Sessions, F = Fallback. Combinable (+IS).
 */
export const GLYPH = "△";

/** Default context-usage percent above which the compact nudge fires. */
export const DEFAULT_NUDGE_THRESHOLD_PERCENT = 60;

export type StatusSeverity = "dim" | "warning";

export interface StartupStatus {
	label: string;
	severity: StatusSeverity;
}

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
 * Patterns the user types when *asking* bonfire what to do (rather than
 * stating the goal of the session). The session's first prompt is often one
 * of these because users open Pi to resume — using it as the goal pollutes
 * bonfire with self-referential "what's next?" entries.
 */
const LOW_SIGNAL_PROMPT_PATTERNS: RegExp[] = [
	/^what'?s next( for (this|the) project)?$/i,
	/^what should i do( next)?$/i,
	/^(continue|go on|ok(ay)?|next|proceed|carry on|go|yes|y|sure|done|thanks)$/i,
	/^(hi|hey|hello|sup|yo)$/i,
];

export function isLowSignalPrompt(text: string): boolean {
	const trimmed = text.trim().toLowerCase().replace(/[?!.]+$/, "");
	if (trimmed.length < 8) return true;
	return LOW_SIGNAL_PROMPT_PATTERNS.some((re) => re.test(trimmed));
}

/**
 * Structured rollup of a session's entries. Computed without an LLM by
 * walking `ctx.sessionManager.getEntries()` directly. Used by the fallback
 * path so we get meaningful summaries even when Pi's compaction pipeline
 * is broken or hasn't fired (short sessions).
 */
export interface SessionRollup {
	/** First user prompt that wasn't "what's next?"-style. Null when no prompts. */
	goal: string | null;
	/** Most recent non-trivial prompt that isn't the goal. Null when only one prompt. */
	recentDirection: string | null;
	/** Edited file paths, /tmp filtered, deduped against `written`. */
	edited: string[];
	/** Written file paths, /tmp filtered. "Wrote" wins over "Edited" for new files. */
	written: string[];
	bashCount: number;
	readCount: number;
	/** Last assistant text block. Often contains PR/Linear wrap-up summaries. */
	lastAssistantText: string | null;
	promptCount: number;
	messageCount: number;
}

/**
 * Walk `ctx.sessionManager.getEntries()` and roll up the structured signals
 * we can render from. Pure function over the SessionEntry shape; safe to
 * unit-test with synthetic fixtures.
 */
export function summarizeSessionEntries(entries: readonly any[]): SessionRollup {
	const prompts: string[] = [];
	const edited: string[] = [];
	const written: string[] = [];
	let bashCount = 0;
	let readCount = 0;
	let lastAssistantText: string | null = null;
	let messageCount = 0;

	for (const entry of entries) {
		if (entry?.type !== "message") continue;
		messageCount++;
		const msg = entry.message;
		if (!msg) continue;

		if (msg.role === "user") {
			const text = extractContentText(msg.content);
			// Skip clipboard/image-paste content (Pi inserts /var/folders/.../*.png).
			if (text && !/^\/var\/folders\/.+\.(png|jpg|jpeg|gif|webp)/.test(text)) {
				prompts.push(text);
			}
		} else if (msg.role === "assistant") {
			for (const c of msg.content ?? []) {
				if (!c || typeof c !== "object") continue;
				if (c.type === "toolCall") {
					const args = c.arguments ?? {};
					if (c.name === "edit" && typeof args.path === "string") edited.push(args.path);
					else if (c.name === "write" && typeof args.path === "string") written.push(args.path);
					else if (c.name === "bash") bashCount++;
					else if (c.name === "read") readCount++;
				} else if (c.type === "text") {
					const text = typeof c.text === "string" ? c.text : "";
					if (text.trim()) lastAssistantText = text;
				}
			}
		}
	}

	let goal: string | null = null;
	for (const p of prompts) {
		if (!isLowSignalPrompt(p)) {
			goal = p;
			break;
		}
	}
	if (!goal && prompts.length) goal = prompts[0];

	let recentDirection: string | null = null;
	for (let i = prompts.length - 1; i >= 0; i--) {
		const p = prompts[i];
		if (isLowSignalPrompt(p)) continue;
		if (p === goal) continue;
		recentDirection = p;
		break;
	}

	const editedClean = unique(edited).filter(isRealPath);
	const writtenClean = unique(written).filter(isRealPath);
	// A file written then edited shouldn't appear twice. Written wins because
	// it's the stronger signal (brand-new file).
	const writtenSet = new Set(writtenClean);
	const editedOnly = editedClean.filter((p) => !writtenSet.has(p));

	return {
		goal,
		recentDirection,
		edited: editedOnly,
		written: writtenClean,
		bashCount,
		readCount,
		lastAssistantText,
		promptCount: prompts.length,
		messageCount,
	};
}

/**
 * Does the session have enough substance to write a bonfire entry from?
 * Returns false when overwriting prior in-flight would lose more than we gain
 * (user opened Pi, said "what's next?", read the summary, quit).
 */
export function hasEnoughSignal(rollup: SessionRollup): boolean {
	const toolEvents = rollup.edited.length + rollup.written.length + rollup.bashCount;
	const hasSubstantiveGoal = rollup.goal !== null && !isLowSignalPrompt(rollup.goal);
	return toolEvents >= 3 || hasSubstantiveGoal;
}

/**
 * Build the in-flight body from a structured SessionRollup (no LLM). This
 * is the v0.2 fallback that replaces `renderFallbackInflight`: it surfaces
 * the goal, recent direction, file activity, and the last assistant text
 * block (often a PR/Linear wrap-up).
 *
 * Robust to pi#4811 (no LLM in the loop) and to runtime teardown (no async).
 */
export function renderFallbackInflightFromEntries(
	rollup: SessionRollup,
	meta: InflightMeta,
	modifiedFiles: readonly string[],
	cwd: string | null,
): string {
	const lines: string[] = [];
	lines.push("");
	lines.push("## In flight");
	lines.push("");
	lines.push(`_Updated ${meta.date} from ${meta.host}:${meta.shortId} on \`${meta.branch}\`_`);
	lines.push("");

	const goalText =
		rollup.goal && !isLowSignalPrompt(rollup.goal)
			? truncate(firstSentence(rollup.goal), 200)
			: `Resumed session on \`${meta.branch}\``;
	lines.push("### Goal");
	lines.push(goalText);
	lines.push("");

	if (rollup.recentDirection) {
		lines.push("### Recent direction");
		lines.push(truncate(firstSentence(rollup.recentDirection), 200));
		lines.push("");
	}

	const done: string[] = [];
	for (const f of rollup.written.slice(0, 6)) done.push(`- Wrote \`${shortPath(f, cwd)}\``);
	for (const f of rollup.edited.slice(0, 6)) done.push(`- Edited \`${shortPath(f, cwd)}\``);
	if (rollup.bashCount > 0) {
		let line = `- Ran ${rollup.bashCount} shell command${rollup.bashCount === 1 ? "" : "s"}`;
		if (rollup.readCount > 0) {
			line += `, read ${rollup.readCount} file${rollup.readCount === 1 ? "" : "s"}`;
		}
		done.push(line);
	}
	if (done.length) {
		lines.push("### Done");
		for (const l of done) lines.push(l);
		lines.push("");
	}

	if (rollup.lastAssistantText) {
		lines.push("### Where we left off");
		lines.push(truncateLines(rollup.lastAssistantText, 12, 800));
		lines.push("");
	}

	if (modifiedFiles.length > 0) {
		lines.push("### Uncommitted");
		for (const f of modifiedFiles.slice(0, 10)) lines.push(`- \`${f}\``);
		if (modifiedFiles.length > 10) {
			lines.push(`- _(…and ${modifiedFiles.length - 10} more)_`);
		}
		lines.push("");
	}

	return lines.join("\n").trimEnd();
}

/**
 * Extract a candidate one-liner for the Sessions row from a SessionRollup.
 * Returns null when the rollup has no substantive goal (caller should bail
 * rather than write a "what's next?"-style row).
 */
export function rollupOneLiner(rollup: SessionRollup): string | null {
	if (!rollup.goal) return null;
	if (isLowSignalPrompt(rollup.goal)) return null;
	return truncate(firstSentence(rollup.goal), ONE_LINER_MAX);
}

function extractContentText(content: unknown): string {
	if (typeof content === "string") return content.trim();
	if (!Array.isArray(content)) return "";
	const parts: string[] = [];
	for (const c of content) {
		if (c && typeof c === "object" && (c as any).type === "text" && typeof (c as any).text === "string") {
			parts.push((c as any).text);
		}
	}
	return parts.join("\n").trim();
}

function unique<T>(arr: readonly T[]): T[] {
	return [...new Set(arr.filter((x) => x))];
}

function isRealPath(p: string): boolean {
	return !!p && !p.startsWith("/tmp/") && !p.startsWith("/var/");
}

function firstSentence(text: string): string {
	// First sentence-ish boundary. Be conservative — don't break inside short
	// tokens like "v0.2" or URLs.
	const m = text.match(/^([^\n]+?[.!?])(\s|$)/);
	return m ? m[1] : text;
}

function shortPath(p: string, cwd: string | null): string {
	if (cwd && p.startsWith(cwd + "/")) return p.slice(cwd.length + 1);
	return p.replace(/^\/Users\/[^/]+\/dev\/[^/]+\//, "");
}

function truncateLines(text: string, maxLines: number, maxChars: number): string {
	const lines = text.trim().split("\n");
	let out = lines.slice(0, maxLines).join("\n");
	if (out.length > maxChars) out = out.slice(0, maxChars).trimEnd() + "…";
	if (lines.length > maxLines) out += `\n\n_…(${lines.length - maxLines} more lines)_`;
	return out;
}

/**
 * True when both managed fences are present in index.md content. Used by the
 * startup-status resolver to differentiate legacy / hand-written index files
 * (which the adapter can't update) from real v7.0+ files.
 */
export function hasFences(content: string): boolean {
	return (
		content.includes(INFLIGHT_START) &&
		content.includes(INFLIGHT_END) &&
		content.includes(SESSIONS_START) &&
		content.includes(SESSIONS_END)
	);
}

/**
 * Parse the "_Updated YYYY-MM-DD from pi:<id> on `branch`_" header that
 * `renderInflight` and `renderFallbackInflightFromEntries` emit. Returns the
 * age of the in-flight section in whole days (UTC), or null when the header
 * is missing/unparseable.
 */
export function extractInflightAge(content: string, now: Date): number | null {
	const inflight = extractFenceContent(content, INFLIGHT_START, INFLIGHT_END);
	if (!inflight) return null;
	const m = inflight.match(/_Updated\s+(\d{4}-\d{2}-\d{2})/);
	if (!m) return null;
	const then = Date.parse(`${m[1]}T00:00:00Z`);
	if (Number.isNaN(then)) return null;
	const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
	const days = Math.floor((today - then) / 86_400_000);
	return days < 0 ? 0 : days;
}

/**
 * Extract the short session id from the in-flight "from pi:<id>" header.
 * Used to detect stale in-flight content that belongs to a different
 * session and should not be treated as the current user's context.
 */
export function extractInflightSessionShortId(content: string): string | null {
	const inflight = extractFenceContent(content, INFLIGHT_START, INFLIGHT_END);
	if (!inflight) return null;
	const m = inflight.match(/from\s+pi:([a-f0-9]+)/i);
	return m?.[1] ?? null;
}

/**
 * Parse the newest sessions row. Returns the row date (ISO yyyy-mm-dd) or
 * null when the sessions block is empty. We deliberately don't surface the
 * row's one-liner in the status footer — too noisy at glyph density — but
 * the date drives the breadcrumb age display.
 */
export function parseNewestSessionRow(content: string): { date: string } | null {
	const block = extractFenceContent(content, SESSIONS_START, SESSIONS_END);
	if (!block) return null;
	for (const raw of block.split("\n")) {
		const line = raw.trim();
		if (!line.startsWith("- ")) continue;
		const m = line.match(/^-\s+(\d{4}-\d{2}-\d{2})\b/);
		if (m) return { date: m[1] };
	}
	return null;
}

/**
 * Compact age formatter matching Pi's k/M units convention:
 *   0 days  -> "today"
 *   < 1 day -> unused (we round to whole days)
 *   1-13d   -> "Nd"
 *   14-59d  -> "Nw"
 *   60d+    -> "Nmo"
 *
 * The breadcrumb and stale-warning paths both call this, so the same value
 * appears in both `△ 2d` (breadcrumb) and `△ !7d` (warning) — visual
 * vocabulary stays one-to-one.
 */
export function formatAge(daysAgo: number): string {
	if (daysAgo <= 0) return "today";
	if (daysAgo < 14) return `${daysAgo}d`;
	if (daysAgo < 60) return `${Math.floor(daysAgo / 7)}w`;
	return `${Math.floor(daysAgo / 30)}mo`;
}

/**
 * Compose the startup status label for the bonfire slot. Pure function of
 * (index.md content, current session short id, current time) so callers can
 * unit-test every branch without booting Pi.
 *
 * Decision tree:
 *   content === null            -> "△ !init"   warning  (no index.md yet)
 *   no fences                   -> "△ !fences" warning  (legacy / hand-written)
 *   in-flight from other session AND age > 1 day
 *                               -> "△ !{age} {breadcrumb?}" warning
 *   newest sessions row exists  -> "△ {age}"   dim     (breadcrumb only)
 *   else                        -> "△"         dim     (bare tracking)
 */
export function resolveStartupStatus(
	content: string | null,
	currentShortId: string,
	now: Date,
): StartupStatus {
	if (content === null) {
		return { label: `${GLYPH} !init`, severity: "warning" };
	}
	if (!hasFences(content)) {
		return { label: `${GLYPH} !fences`, severity: "warning" };
	}

	const inflightSession = extractInflightSessionShortId(content);
	const inflightAge = extractInflightAge(content, now);
	const inflightIsStale =
		inflightSession !== null &&
		inflightSession !== currentShortId &&
		inflightAge !== null &&
		inflightAge > 1;

	const newest = parseNewestSessionRow(content);
	const breadcrumbAge =
		newest !== null
			? daysBetween(Date.parse(`${newest.date}T00:00:00Z`), now)
			: null;

	if (inflightIsStale && inflightAge !== null) {
		const stale = `!${formatAge(inflightAge)}`;
		const showBreadcrumb =
			breadcrumbAge !== null && breadcrumbAge < inflightAge;
		const label = showBreadcrumb
			? `${GLYPH} ${stale} ${formatAge(breadcrumbAge!)}`
			: `${GLYPH} ${stale}`;
		return { label, severity: "warning" };
	}

	if (breadcrumbAge !== null) {
		return { label: `${GLYPH} ${formatAge(breadcrumbAge)}`, severity: "dim" };
	}

	return { label: GLYPH, severity: "dim" };
}

function daysBetween(then: number, now: Date): number {
	if (Number.isNaN(then)) return 0;
	const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
	return Math.max(0, Math.floor((today - then) / 86_400_000));
}

/**
 * Compose the result label after a compaction successfully wrote to one or
 * both fences. Returns null when nothing was touched (caller should leave
 * the existing status alone in that case).
 */
export function formatCompactResult(touchedInflight: boolean, touchedSessions: boolean): string | null {
	if (!touchedInflight && !touchedSessions) return null;
	let letters = "";
	if (touchedInflight) letters += "I";
	if (touchedSessions) letters += "S";
	return `${GLYPH} +${letters}`;
}

/** Status label for the session-shutdown fallback write. */
export function formatFallbackResult(): string {
	return `${GLYPH} +F`;
}

/** Status label for the compact-nudge (high context fill, no compaction yet). */
export function formatNudge(): string {
	return `${GLYPH} ?compact`;
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
