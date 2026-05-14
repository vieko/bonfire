# Changelog

All notable changes to this project will be documented in this file.

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
