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
 * Status footer follows Pi's compact label convention (single glyph + sigil
 * + letter, no English). See lib.ts GLYPH/format* exports for the full
 * vocabulary.
 *
 * Per-repo opt-out: .bonfire/config.json with { "auto": false }.
 */

import type { ExtensionAPI, ExtensionContext, SessionCompactEvent } from "@earendil-works/pi-coding-agent";
import { execSync } from "node:child_process";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import {
	bootstrapTemplate,
	DEFAULT_NUDGE_THRESHOLD_PERCENT,
	extractFenceContent,
	extractOneLiner,
	findRowForKey,
	formatCompactResult,
	formatFallbackResult,
	formatNudge,
	GLYPH,
	hasEnoughSignal,
	shortenSessionId,
	INFLIGHT_END,
	INFLIGHT_START,
	isGarbageSummary,
	renderFallbackInflightFromEntries,
	renderInflight,
	replaceFence,
	resolveStartupStatus,
	rollupOneLiner,
	summarizeSessionEntries,
	upsertSessionRow,
} from "./lib";

const HOST = "pi";

// Module-scoped: which sessions have compacted at least once during this
// process. Used to gate the compact-nudge so it doesn't fire forever once
// bonfire has already written for the current session.
const compactedSessions = new Set<string>();
// Sessions where we've already shown the nudge once. Avoids re-painting the
// same status on every turn while waiting for the user to compact.
const nudgedSessions = new Set<string>();

/**
 * Who last painted the bonfire status slot for a given session.
 *
 * The `turn_end` self-heal repaint is the reason this exists: we want to
 * recover the diagnostic when `session_start` was missed (long-lived
 * session pre-dating this extension version, async load race, error
 * inside the handler) WITHOUT clobbering legitimate non-diagnostic
 * labels (`△ +IS` / `△ +F` / `△ ?compact`) that other handlers paint.
 *
 * Rule: turn_end may repaint the diagnostic iff the current owner is
 * undefined (nothing painted) or "diagnostic" (we own it).
 */
type StatusOwner = "diagnostic" | "compact" | "fallback" | "nudge";
const sessionStatusOwner = new Map<string, StatusOwner>();

export default function (pi: ExtensionAPI) {
	// session_start: resolve a diagnostic startup status from the existing
	// index.md so the user can see immediately whether the next compaction
	// will land somewhere useful (e.g. "△ !fences" for legacy files, "△ !7d"
	// for stale in-flight from another session).
	pi.on("session_start", async (_event, ctx) => {
		if (!ctx.hasUI) return;
		try {
			if (await updateStartupStatus(ctx)) {
				const sessionId = ctx.sessionManager.getSessionId();
				if (sessionId) sessionStatusOwner.set(sessionId, "diagnostic");
			}
		} catch (err) {
			if (process.env.BONFIRE_DEBUG === "1") {
				const msg = err instanceof Error ? err.message : String(err);
				process.stderr.write(`bonfire status: ${msg}\n`);
			}
		}
	});

	pi.on("session_compact", async (event, ctx) => {
		try {
			const result = await updateBonfireIndex(event, ctx);
			const sessionId = ctx.sessionManager.getSessionId();
			compactedSessions.add(sessionId);
			if (!result) return;
			if (ctx.hasUI) {
				const label = formatCompactResult(result.touchedInflight, result.touchedSessions);
				if (label) {
					ctx.ui.setStatus("bonfire", ctx.ui.theme.fg("dim", label));
					if (sessionId) sessionStatusOwner.set(sessionId, "compact");
				}
			}
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			ctx.ui.notify(`bonfire: ${msg}`, "warning");
		}
	});

	// turn_end does two things:
	//
	//   1. Self-heal the diagnostic status when session_start didn't paint
	//      (long-lived session that pre-dates this extension version, async
	//      load race, silent failure inside the handler). We only repaint
	//      when the slot is unowned or already diagnostic-owned, so we
	//      never clobber a legitimate `△ +IS` / `△ +F` / `△ ?compact`.
	//
	//   2. Surface the compact-nudge when context is filling up but no
	//      compaction has fired this session yet. Once compaction (auto
	//      or manual) lands, the session_compact handler updates the
	//      status and the gate inside maybeShowCompactNudge suppresses
	//      further nudges.
	pi.on("turn_end", async (_event, ctx) => {
		try {
			if (ctx.hasUI) {
				const sessionId = ctx.sessionManager.getSessionId();
				if (sessionId) {
					const owner = sessionStatusOwner.get(sessionId);
					if (owner === undefined || owner === "diagnostic") {
						if (await updateStartupStatus(ctx)) {
							sessionStatusOwner.set(sessionId, "diagnostic");
						}
					}
				}
			}
			await maybeShowCompactNudge(ctx);
		} catch (err) {
			if (process.env.BONFIRE_DEBUG === "1") {
				const msg = err instanceof Error ? err.message : String(err);
				process.stderr.write(`bonfire nudge: ${msg}\n`);
			}
		}
	});

	// Fallback path: when the session ends, if no compaction produced a usable
	// row (either none fired, or Pi's compaction returned garbage), use the
	// session entries to synthesize a structured rollup and write it.
	// This makes bonfire useful even when Pi's compaction pipeline is broken or
	// when sessions are too short to compact.
	pi.on("session_shutdown", async (_event, ctx) => {
		try {
			const wrote = await maybeWriteFallback(ctx);
			if (wrote && ctx.hasUI) {
				ctx.ui.setStatus("bonfire", ctx.ui.theme.fg("dim", formatFallbackResult()));
				const sessionId = ctx.sessionManager.getSessionId();
				if (sessionId) sessionStatusOwner.set(sessionId, "fallback");
			}
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			if (process.env.BONFIRE_DEBUG === "1") process.stderr.write(`bonfire fallback: ${msg}\n`);
		}
	});
}

interface BonfireConfig {
	auto?: boolean;
	nudgeThresholdPercent?: number;
}

interface CompactResult {
	touchedInflight: boolean;
	touchedSessions: boolean;
}

/**
 * Resolve and paint the diagnostic status for the current repo. Returns
 * true when a status was actually painted (so callers can record
 * ownership), false on any early-return path (no git root, no
 * .bonfire/, auto disabled). Throws are caught by the caller.
 */
async function updateStartupStatus(ctx: ExtensionContext): Promise<boolean> {
	const gitRoot = findGitRoot(ctx.cwd);
	if (!gitRoot) return false;

	const bonfireDir = path.join(gitRoot, ".bonfire");
	try {
		const stat = await fs.stat(bonfireDir);
		if (!stat.isDirectory()) return false;
	} catch {
		return false; // silent: not an opted-in repo
	}

	const config = await readConfig(gitRoot);
	if (config?.auto === false) return false;

	const indexPath = path.join(gitRoot, ".bonfire", "index.md");
	let content: string | null = null;
	try {
		content = await fs.readFile(indexPath, "utf8");
	} catch {
		// fall through; resolveStartupStatus returns "△ !init" for null content
	}

	const sessionId = ctx.sessionManager.getSessionId();
	const shortId = sessionId ? shortenSessionId(sessionId) : "";
	const status = resolveStartupStatus(content, shortId, new Date());

	const color = status.severity === "warning" ? "yellow" : "dim";
	ctx.ui.setStatus("bonfire", ctx.ui.theme.fg(color, status.label));
	return true;
}

async function updateBonfireIndex(
	event: SessionCompactEvent,
	ctx: ExtensionContext,
): Promise<CompactResult | null> {
	const gitRoot = findGitRoot(ctx.cwd);
	if (!gitRoot) return null;

	// Opt-in: only act when the user has created <git-root>/.bonfire/ themselves.
	// We never auto-create the directory; that would pollute every repo where Pi
	// happens to compact.
	const bonfireDir = path.join(gitRoot, ".bonfire");
	try {
		const stat = await fs.stat(bonfireDir);
		if (!stat.isDirectory()) return null;
	} catch {
		return null;
	}

	const config = await readConfig(gitRoot);
	if (config?.auto === false) return null;

	const summary = event.compactionEntry.summary;

	// Skip writing when Pi's compaction returned garbage. The shutdown
	// handler will fill in a fallback row from session entries instead.
	if (isGarbageSummary(summary)) return null;

	const oneLiner = extractOneLiner(summary);
	if (!oneLiner) return null;

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

	if (!touchedInflight && !touchedSessions) return null;

	await atomicWrite(indexPath, next);
	return { touchedInflight, touchedSessions };
}

async function maybeShowCompactNudge(ctx: ExtensionContext): Promise<void> {
	if (!ctx.hasUI) return;

	const sessionId = ctx.sessionManager.getSessionId();
	if (!sessionId) return;
	if (compactedSessions.has(sessionId)) return; // already covered for this session
	if (nudgedSessions.has(sessionId)) return; // already painted nudge once

	const gitRoot = findGitRoot(ctx.cwd);
	if (!gitRoot) return;
	try {
		const stat = await fs.stat(path.join(gitRoot, ".bonfire"));
		if (!stat.isDirectory()) return;
	} catch {
		return;
	}

	const config = await readConfig(gitRoot);
	if (config?.auto === false) return;
	const threshold = config?.nudgeThresholdPercent ?? DEFAULT_NUDGE_THRESHOLD_PERCENT;

	const usage = ctx.getContextUsage();
	if (!usage || usage.percent === null) return;
	if (usage.percent < threshold) return;

	ctx.ui.setStatus("bonfire", ctx.ui.theme.fg("dim", formatNudge()));
	nudgedSessions.add(sessionId);
	sessionStatusOwner.set(sessionId, "nudge");
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
 * Session-end fallback: write a structured rollup from session entries when
 * Pi's compaction didn't produce something useful for this session.
 *
 * Robust to pi#4811 (no LLM in the loop) and to runtime teardown (no async
 * provider calls). Surfaces goal + recent direction + file activity + the
 * last assistant text block (often a PR/Linear wrap-up).
 *
 * Conditions for writing:
 *   - .bonfire/ exists (opt-in gate)
 *   - config.json doesn't have { auto: false }
 *   - sessionManager has a valid sessionId
 *   - Session has enough signal (substantive goal or >=3 tool events)
 *   - Either no row exists for this session, or the existing row/in-flight
 *     is garbage (Pi compaction bug output) / stale (different session).
 *
 * Returns true when something was written (caller updates status), false
 * otherwise.
 */
async function maybeWriteFallback(ctx: ExtensionContext): Promise<boolean> {
	const gitRoot = findGitRoot(ctx.cwd);
	if (!gitRoot) return false;

	const bonfireDir = path.join(gitRoot, ".bonfire");
	try {
		const stat = await fs.stat(bonfireDir);
		if (!stat.isDirectory()) return false;
	} catch {
		return false;
	}

	const config = await readConfig(gitRoot);
	if (config?.auto === false) return false;

	const sessionId = ctx.sessionManager.getSessionId();
	if (!sessionId) return false;
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

	if (!rowNeedsFallback && !inflightNeedsFallback) return false;

	const rollup = summarizeSessionEntries(ctx.sessionManager.getEntries());
	if (!hasEnoughSignal(rollup)) return false;

	const branch = getGitBranch(gitRoot) ?? "(detached)";
	const modifiedFiles = getGitModifiedFiles(gitRoot);
	const date = new Date().toISOString().slice(0, 10);
	const meta = { date, host: HOST, shortId, branch };

	// Bootstrap if file is missing (first ever bonfire write for this repo).
	await ensureBonfireFile(indexPath, path.basename(gitRoot));
	if (content === null) content = await fs.readFile(indexPath, "utf8");

	let next = content;

	if (inflightNeedsFallback) {
		const inflightMd = renderFallbackInflightFromEntries(rollup, meta, modifiedFiles, gitRoot);
		const updated = replaceFence(next, INFLIGHT_START, INFLIGHT_END, inflightMd);
		if (updated !== null) next = updated;
	}

	if (rowNeedsFallback) {
		// Prefer the rollup's cleaned goal as the one-liner. Bail on the row
		// when the goal is too low-signal to write (hasEnoughSignal may still
		// be true from tool events alone, in which case we keep in-flight but
		// don't pollute the sessions cap).
		const oneLiner = rollupOneLiner(rollup);
		if (oneLiner) {
			const row = `- ${date} [pi:${shortId}] ${branch} — ${oneLiner}`;
			const updated = upsertSessionRow(next, `[pi:${shortId}]`, row);
			if (updated !== null) next = updated;
		}
	}

	if (next === content) return false;
	await atomicWrite(indexPath, next);
	return true;
}
