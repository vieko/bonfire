# Changelog

All notable changes to this project will be documented in this file.

## [5.0.0] - 2026-02-22

### BREAKING CHANGES

- **`linear` config renamed to `issues`** - Frontmatter setting is now `issues: true/false` instead of `linear: true/false`. Generic name supports any issue tracker.

### Removed

- **Redundant session data reading** - Bonfire's own `index.md` already captures session history; removed redundant external sources
- **Unnecessary tool declarations from allowed-tools** - The agent already has access to its installed tools; bonfire doesn't need to re-declare them
- **Explicit config path references** - Auto-memory is loaded automatically; no need to reference specific paths
- **Optional integrations section from README** - No longer lists specific tool install instructions

### Added

- **Topic parameter sanitization** - Spec, doc, and review commands now require stripping path separators, special characters, and traversal patterns (`../`) from topic parameters before using them as filenames
- **Generic issue tracker language** - Commands reference "configured issue tracker" instead of naming specific tools

### Migration

- Rename `linear: true/false` to `issues: true/false` in `.bonfire/index.md` frontmatter
- No other changes needed — issue tracking still works, the agent uses available tools

## [4.0.0 – 4.3.3]

See git history for changes from v4.0.0 (consolidated to single skill) through v4.3.3.

## [0.3.0 – 2.0.0]

See git history for earlier versions. Originally published as [create-sessions-dir](https://github.com/vieko/create-sessions-dir).
