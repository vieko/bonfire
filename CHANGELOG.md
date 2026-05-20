# Changelog

All notable changes to this project will be documented in this file.

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
