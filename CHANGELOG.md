# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

Internal: a cross-producer conformance harness that enforces bonfire's headline invariant — every producer emits byte-identical fence shapes. No user-visible behavior change; no fence-format bump.

### Added

- **`conformance.mjs`** (repo root; `tsx conformance.mjs` or `npm test`). Imports the shared fence primitives from *both* code producers and asserts byte-identical output for `replaceFence` / `upsertSessionRow` / `shortenSessionId` / `truncate` across insert / dedupe / cap-5 / header-preservation / missing-fence cases. Pins one canonical grammar for the in-flight attribution header and the sessions row, checks the real Pi renderers emit it, and verifies the prose fallback skill (`end.md`, `templates/index.md`) documents that same grammar — the only way to cover a producer that can't be executed. The in-flight *body* is intentionally divergent across producers and is never asserted equal.
- **Root `npm test` script** running all four suites (pi unit + smoke, claude, conformance) from one entrypoint.
- **"Fence-contract sync contract" section in `AGENTS.md`** enumerating the three producers, the shared surface, and the deliberately-divergent in-flight body.

### Changed

- **Extracted `claude/lib.mjs`** from `claude/update-bonfire.mjs`. The shared fence primitives are now importable so the harness can exercise the Claude side without executing the Stop hook (which runs `main()` on import). Behavior-preserving: `claude/test.mjs` is unchanged and green; `HOST = "claude"` stays adapter-local.

## [7.3.1] - 2026-06-08

Fixes the shutdown fallback clobbering manually-restored or hand-written in-flight content with sparse "Ran N commands" output.

### Fixed

- **Unattributed in-flight preserved on session shutdown** (`pi/extension.ts`). The fallback's stale-inflight check evaluated `null !== shortId` as `true` when the in-flight block had no `from pi:xxx` header, making every hand-written or manually-restored block appear stale. The fix adds the same null-guard that `resolveStartupStatus` already had: only overwrite in-flight that is *positively attributed to a different session*. Unattributed content is left alone.
- **Regression test** added to `smoke.mjs`: manually-restored in-flight with `### Next Steps` survives a session with substantive activity unchanged.

## [7.3.0] - 2026-05-21

Migration support for pre-v7 `index.md` files, plus an actionable notify on the `△ !fences` diagnostic so users can discover the fix without reading the README.

### Added

- **`/skill:bonfire migrate` command** (`skills/bonfire/commands/migrate.md`) for upgrading pre-v7 `index.md` files to the v1 fence shape, preserving all curated content. Migration shape:
  - Inserts the v1 fence pair right after the H1.
  - Renames legacy `## In flight` → `## Notes` (the canonical curated heading).
  - **Moves legacy `## Sessions` content to `<git-root>/.bonfire/log.md`** as a sidecar (the canonical destination for sessions overflow per the README), removing the `## Sessions` H2 from `index.md` entirely. Honors v6.2's "no per-session prose accumulation in the index" principle.
  - Leaves all other H2 sections (runbooks, checklists, etc.) and free-form prose in their original positions, byte-for-byte.
  - Atomic writes for both `index.md` and the sidecar. `.pre-migrate-*.bak` for `index.md`; `log-pre-migrate-*.md` for sidecar collisions. Never silently overwrites.
- **Actionable notify on `△ !fences`** in the Pi adapter. When the startup diagnostic resolves to a warning state with a known remediation, `ctx.ui.notify(message, "warning")` surfaces the exact command (`bonfire: legacy index detected. Run \`/skill:bonfire migrate\` to upgrade.`). Deduped per session + warning kind via a new module-level `notifiedSessions: Set<string>` so re-paints (turn_end self-heal) don't re-notify. Self-extinguishing UX: once the migration runs, the next session resolves to healthy and the notify never fires again.
- **`## Notes` documented as the canonical curated heading** in the root README. Pair with the existing `## In flight` (auto-managed inside fence) for symmetric vocabulary. The README also clarifies that the canonical destination for sessions overflow / migration is `.bonfire/log.md`, not an in-file `## Session archive` heading — explicitly to avoid sanctioning the v6.2 anti-pattern of accumulating session prose in `index.md`.
- **2 new smoke assertions** verifying notify fires exactly once on the first `△ !fences` paint and is suppressed on subsequent re-paints in the same session.

### Notes

No fence-format bump. No lib changes. Pin via `git:github.com/vieko/bonfire@v7.3.0`. The migration command lives in the fallback skill, so any agent that can load skills can invoke it on any host — not Pi-specific.

## [7.2.2] - 2026-05-21

Fixes the v7.2.0 startup diagnostic silently dying on themes that don't define the literal color `yellow`. The diagnostic now uses Pi's semantic `warning` color which is guaranteed across every theme.

### Fixed

- **Status diagnostic now paints on non-default themes.** Repro: user has `"theme": "one-dark"` in `settings.json`. v7.2.0 passed `theme.fg("yellow", ...)` for warning-severity labels. Pi's theme system throws on unknown color names rather than falling back, so `updateStartupStatus` silently threw inside its caller's try/catch every time — leaving the bonfire status slot blank even when `△ !fences` / `△ !7d` / `△ !init` should have appeared. Replaced the literal `"yellow"` with the semantic `"warning"` color name, which every Pi theme is required to define (see `ThemeJsonSchema` in `pi-coding-agent/dist/modes/interactive/theme/theme.js`).
- **Smoke test now mirrors Pi's strict theme behavior.** The previous stub accepted any color name without validating; the regression slipped past because of that. New `KNOWN_THEME_COLORS` set in `pi/smoke.mjs` enforces the same constraint the real Pi theme does, so the next time someone passes a non-schema color, the smoke test fails instead of production.

### Notes

No fence-format bump. No lib changes. v7.2.1's `turn_end` self-heal was correct in design but couldn't help here — the underlying paint call threw, so there was nothing for the self-heal to recover. Pin via `git:github.com/vieko/bonfire@v7.2.2`.

## [7.2.1] - 2026-05-21

Pi adapter status diagnostic is now self-healing. Long-lived sessions that pre-date this extension version (or hit an async load race / silent error during `session_start`) now get the diagnostic painted on the next `turn_end` instead of staying invisible.

### Fixed

- **Status diagnostic now self-heals via `turn_end`.** Repro: a Pi session that was already running when `pi update` pulled a newer bonfire version never receives `session_start`, so v7.2.0's `△ !fences` / `△ !init` / `△ !7d` / `△ 1d` / `△` labels would never appear for the rest of that session's lifetime — even when `.bonfire/index.md` was missing fences entirely. The slot stayed blank, defeating the point of the diagnostic. `turn_end` now repaints the diagnostic when the bonfire status slot is unowned or already diagnostic-owned, with explicit ownership tracking to avoid clobbering legitimate `△ +IS` / `△ +F` / `△ ?compact` labels.
- **`updateStartupStatus` now returns `boolean`** so the caller (both `session_start` and `turn_end`) can record ownership only on actual paint, not on early-return paths (no git root, no `.bonfire/`, `auto: false`).

### Added

- **New module-level `sessionStatusOwner: Map<sessionId, "diagnostic" | "compact" | "fallback" | "nudge">`** in `pi/extension.ts`. Every paint site records its owner; `turn_end` only repaints when the slot is `diagnostic` or unowned.
- **4 new smoke assertions** exercising the self-heal: registering the extension against a fake `ExtensionAPI`, firing `turn_end` against a `.bonfire/index.md` with no fences, and asserting the slot ends up with `△ !fences`. Includes the idempotent-repaint case and the "`session_start` fired normally, `turn_end` doesn't fight it" case.

### Notes

No fence-format bump. No lib/pure-function changes; this is an extension-shaped fix. Pin via `git:github.com/vieko/bonfire@v7.2.1`.

## [7.2.0] - 2026-05-21

Pi adapter footer status now follows Pi's own compact label vocabulary (`↑45 ↓26k R1.3M W107k`-style): single glyph `△` + sigil + letter, no English. The static `"bonfire: tracking"` label is replaced with a diagnostic resolver that surfaces stale in-flight, missing fences, and breadcrumb age at session_start — catching legacy / pre-7.0 index files (like forge's, just migrated today) the moment Pi opens them.

### Added

- **Startup status diagnostics** — `session_start` now reads `.bonfire/index.md` and resolves a state label via `resolveStartupStatus(content, currentShortId, now)`. Vocabulary:
  - `△`          — tracking, nothing notable
  - `△ 2d`       — last session breadcrumb age
  - `△ !7d`      — in-flight is N days stale from another session (warning color)
  - `△ !7d 2d`   — stale in-flight + fresher breadcrumb from yet another session
  - `△ !fences`  — `index.md` exists but is missing the v7.0 fence markers (legacy / hand-written file)
  - `△ !init`    — `.bonfire/` exists, no `index.md` yet
- **Compact-result labels** — after `session_compact` writes, the footer shows `△ +IS`, `△ +I`, or `△ +S` based on which fences were touched. Drops the verbose `"bonfire: in-flight + sessions • 2026-05-21"` label.
- **Shutdown fallback feedback** — when `session_shutdown`'s `maybeWriteFallback` writes a row, the footer flips to `△ +F`. Previously the fallback was invisible to the user (only `BONFIRE_DEBUG=1` stderr surfaced it).
- **Compact nudge** — `turn_end` watches `ctx.getContextUsage()`. When context fills past `nudgeThresholdPercent` (default `60`) and no compaction has fired this session yet, the footer shows `△ ?compact` once. Self-clears when compaction lands (auto or manual). Pi auto-compacts via reserve-tokens (default 16384), which on a 1M-token context window is ~98% — plenty of headroom below for our nudge.
- **New config key** — `.bonfire/config.json` accepts `nudgeThresholdPercent: number` to tune (or disable, by setting to 100) the nudge.
- **New `lib.ts` exports**: `GLYPH`, `DEFAULT_NUDGE_THRESHOLD_PERCENT`, `StartupStatus`, `StatusSeverity`, `hasFences`, `extractInflightAge`, `extractInflightSessionShortId`, `parseNewestSessionRow`, `formatAge`, `resolveStartupStatus`, `formatCompactResult`, `formatFallbackResult`, `formatNudge`.
- **44 new unit tests + 9 new smoke assertions** covering fence detection, age formatting (`today` / `Nd` / `Nw` / `Nmo`), the full `resolveStartupStatus` decision matrix, and label vocabulary.

### Changed

- **Dropped the post-compaction toast notification.** `ctx.ui.notify("bonfire: in-flight + sessions updated", "info")` is gone — the footer is the right surface for this signal, and toasts were intrusive for what is essentially ambient state.
- **`updateBonfireIndex` now returns `{ touchedInflight, touchedSessions } | null`** instead of `void`, so the compaction handler can compose the result label without re-reading state.
- **`maybeWriteFallback` now returns `boolean`** so `session_shutdown` knows whether to paint the `△ +F` label.

### Notes

All changes are additive. No fence-format bump (`v1` markers unchanged). Consumers on `v7.1.x` keep working; the new diagnostics activate as soon as Pi loads the v7.2 extension. To pin: update `~/.pi/agent/settings.json` `packages` entry to `git:github.com/vieko/bonfire@v7.2.0`.

## [7.1.0] - 2026-05-20

Pi adapter fallback path now synthesizes a structured rollup from session entries instead of dumping the first user prompt. Fixes the "`what's next?`" pollution observed on `gtm` and `internal-agents` when [pi#4811](https://github.com/earendil-works/pi/issues/4811) prevents compaction from running.

### Added

- **`summarizeSessionEntries(entries)`** in `pi/lib.ts` — walks `ctx.sessionManager.getEntries()` and rolls up: goal (first non-low-signal prompt), recent direction (most recent non-trivial prompt), edited/written paths (deduped, /tmp-filtered), bash/read counts, and the last assistant text block.
- **`isLowSignalPrompt(text)`** — detects "what's next?", "continue", "ok", etc. Users open Pi to *resume* and their first prompt is often meta-conversation; using it as the goal is structurally wrong.
- **`hasEnoughSignal(rollup)`** — threshold (≥3 tool events OR a substantive goal) to avoid wiping a meaningful prior in-flight when the user just opened Pi, asked a question, and quit.
- **`renderFallbackInflightFromEntries(rollup, meta, modifiedFiles, cwd)`** — builds the in-flight body with Goal / Recent direction / Done / Where we left off / Uncommitted sections. The "Where we left off" surfaces the last assistant message verbatim, which usually contains PR announcements, Linear filings, or status summaries.
- **`rollupOneLiner(rollup)`** — produces the Sessions row text from the rollup's goal (first sentence, truncated). Returns null on low-signal goals to keep the sessions cap clean.
- 61 new unit tests covering low-signal classification, write-then-edit dedup, signal threshold, and rendering across goal/recent-direction/done/where-we-left-off/uncommitted slots.

### Changed

- **`session_shutdown` fallback** now uses `summarizeSessionEntries` + `renderFallbackInflightFromEntries` instead of the previous `extractFirstUserPrompt` + `renderFallbackInflight` path. Robust to pi#4811 (no LLM in the loop) and to runtime teardown (no async provider calls).
- **Sessions row one-liner** is now the rollup's goal (cleaned + first-sentence-trimmed) instead of the raw first user prompt. Fixes "what's next?" rows polluting the 5-row sessions cap.

### Why not `ctx.compact()` in `session_shutdown`

The original v0.2 plan was to call `ctx.compact()` from the shutdown hook so short sessions would get a real summary. Two problems killed that approach:

1. `ctx.compact()` is fire-and-forget; the extension runtime tears down before the LLM round-trip completes.
2. Even if it completed, it would hit [pi#4811](https://github.com/earendil-works/pi/issues/4811) and return empty `<conversation>` content.

Synthesizing the rollup locally beats both: no async, no LLM dependency, and we get to use structured tool-call metadata directly (better fidelity than re-summarizing through an LLM, even if compaction were healthy).

## [7.0.0] - 2026-05-20

Bonfire is no longer a workflow with rituals. It's a **file convention + per-host adapters + a fallback skill**. This release is a complete philosophical rewrite.

### Added

- **`pi/` — Pi adapter package.** Hooks `session_compact` (rich structured Goal/Progress/Next/Blocked summary) AND `session_shutdown` (first-user-prompt fallback with `git diff --name-only HEAD` for modified files). Footer status via `setStatus`. Collision-resistant short ids (skips UUIDv7 timestamp prefix). Opt-in via `mkdir .bonfire`. 86 unit tests.
- **`claude/` — Claude Code adapter.** Stop hook that reads `{type: "ai-title"}` entries directly from the session JSONL transcript. Idempotent across turns (computes new content, skips write when byte-identical). Settings.json snippet to paste — no install script touching your config. 18 unit + integration tests.
- **Fence-block convention** for `.bonfire/index.md`: `<!-- bonfire:auto-inflight:start v1 -->` and `<!-- bonfire:auto-sessions:start v1 -->`. Adapters write only inside the fences; everything else in the file is yours.
- **Per-repo opt-in via `mkdir .bonfire`**: globally-configured adapters don't pollute random projects.
- **Per-repo opt-out via `.bonfire/config.json` with `{ "auto": false }`**.
- **`BONFIRE_DEBUG=1`** environment variable for adapter diagnostics.

### Changed

- **Skill becomes a fallback layer.** `disable-model-invocation: true` means it never autoloads. Only invokes on explicit `/skill:bonfire end` from agents without a native adapter (Codex, OpenCode, etc.).
- **`commands/end.md` rewritten** with explicit acceptance criteria for the fence format, so any agent can produce adapter-compatible output.
- **`templates/index.md`** matches the adapter-shaped bootstrap (both fences present).

### Removed

- **`start` command.** Modern agents auto-read files from `cwd`, so `.bonfire/index.md` is already in context. The start ritual was pure overhead.
- **`handoff` command.** Pi has a richer first-party [`handoff.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/handoff.ts) extension. For non-Pi agents, use Linear, a notes file consumed via `@file` injection, or a draft PR description.
- **`templates/gitignore.md`.** Adapters handle gitignore creation when bootstrapping `.bonfire/`.
- **`~/.bonfire/handoffs/`** directory. No longer used. Safe to delete.

### Migration

- **Existing `.bonfire/index.md` files**: backward compatible. Adapter only touches content inside its fence markers. To opt in to auto-updates, wrap your `## In flight` and `## Sessions` sections in the fence markers shown above.
- **Existing skill commands**:
  - `/bonfire start` → no replacement needed; cwd discovery loads the file automatically
  - `/bonfire end` → install the adapter for your host, or use `/skill:bonfire end` if no adapter exists
  - `/bonfire handoff` → use Pi's first-party `handoff`, Linear, or a notes file
- **`~/.bonfire/handoffs/`** directory: safe to `rm -rf`.

### Why the rewrite

The pre-7.0 skill produced subtle drift: indexes accumulated per-session prose, the start ritual cost tokens for context already loaded via cwd discovery, and the handoff command was never used (an empty directory after weeks in production was the deciding evidence). The new shape removes the ritual layer entirely — adapters do the work invisibly, the skill is the safety net for less-equipped hosts, and the file convention is the durable artifact every agent sees.

## [6.3.0] - 2026-05-14

### Added

- **`handoff` command** - Capture a focused, self-contained task brief for a fresh session to pick up. Writes to `~/.bonfire/handoffs/<slug>.md` (global, not repo-coupled) so the consuming session can be in any repo or no repo at all. One brief = one PR-sized effort; durable status lives in the PR or issue, not the file.
- **Handoff surfacing in `start`** - `/bonfire start` now lists any queued handoffs under `~/.bonfire/handoffs/` so they're discoverable from any session.

## [6.2.0] - 2026-05-08

### Changed

- **Sharpened command outcomes** - `start.md` and `end.md` outcomes are now single, verifiable statements. End-session outcome is "the next session can resume from the index alone — every line earns its keep."
- **Tightened the bonfire/memory boundary** - End-session constraints now explicitly bound the index to in-flight state. Cross-session knowledge (patterns, conventions, gotchas) goes to memory; session state stays in the index. Prevents the index from drifting into a knowledge-repository role memory already covers.
- **Added "don't mirror canonical sources" rule** - Issue trackers, git log, and deployment dashboards are authoritative — reference them, don't copy. Mirrored content goes stale.
- **Added "no per-session prose accumulation" rule** - The most recent session's narrative is enough; older sessions collapse to a one-liner. Prevents indexes from growing unboundedly with per-session highlight blocks.
- **Added "garbage acts or leaves" rule** - A "garbage detected" entry that survives 3+ sessions is itself the garbage.
- **Added verify-before-trust rule to start-session** - Claims the index makes about external state (open PRs, in-review tickets, ticket assignments) are verified against canonical sources before being acted on. The previous session's narrator can be wrong.
- **Simplified template** - Replaced "Current State / Recent Sessions / Next Priorities / Key Resources / Codemap" with three sections: `Last session`, `In flight`, `Sessions`. Default shape no longer invites per-session block accretion.

### Removed

- **Legacy v5→v6 frontmatter migration** from `start.md` (transitional cruft, no longer needed).
- **Arbitrary 20K-token threshold** from `start.md`, replaced with shape-based health check ("rambling prose, mirrored content, stale sections").

## [6.1.0] - 2026-03-13

### Changed

- **Consolidated SKILL.md routing** - Merged Commands, Command Routing, Passive Context, and File Structure sections into a single routing table. Reduces token overhead on every invocation (~150 tokens saved per call).

## [6.0.0] - 2026-03-09

### BREAKING CHANGES

- **Simplified to start/end only** - Removed `config`, `spec`, `doc`, and `review` commands. Bonfire's identity is session persistence; spec creation and code review belong in tools like [Forge](https://github.com/vieko/forge).
- **Removed frontmatter config** - No more `specs`, `docs`, `issues` settings. The `git` key is kept only if non-default.
- **Removed `specs/` and `docs/` subdirectories** - `.bonfire/` now contains only `index.md` and `.gitignore`.
- **Removed `AskUserQuestion` from allowed-tools** - No longer needed without interactive commands.

### Migration

- Existing `.bonfire/index.md` files work as-is. Legacy frontmatter keys are silently removed on next `/bonfire start`.
- Specs and docs in `.bonfire/specs/` and `.bonfire/docs/` are untouched — move them if desired.
- See [vieko/forge#29](https://github.com/vieko/forge/issues/29) for the interactive spec command handoff.

## [5.0.0] - 2026-02-22

See git history for v5.0.0 changes (`linear` → `issues` rename, security audit fixes).

## [4.0.0 – 4.3.3]

See git history for changes from v4.0.0 (consolidated to single skill) through v4.3.3.

## [0.3.0 – 2.0.0]

See git history for earlier versions. Originally published as [create-sessions-dir](https://github.com/vieko/create-sessions-dir).
