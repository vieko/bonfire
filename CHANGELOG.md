# Changelog

All notable changes to this project will be documented in this file.

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
