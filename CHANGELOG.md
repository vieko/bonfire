# Changelog

All notable changes to this project will be documented in this file.

## [0.4.1] - 2025-12-22

### Fixed

- **`/sessions:configure`** - Now always runs interactively with all 4 questions
- **`/sessions:end`** - Checks git strategy before committing; skips for `ignore-all`
- **`/sessions:git-strategy`** - Now uses `AskUserQuestion` for consistent UX
- **`/sessions:start`** - Aligned question format with configure command
- **`session-context` skill** - Removed references to non-existent `prep/` and `packages/` directories

### Changed

- Removed `scripts/configure.sh` reference from CHANGELOG (was removed in refactor)

## [0.4.0] - 2025-12-22

### Added

- **`/sessions:review`** - Strategic work review command
  - Identifies blindspots, gaps, quick wins
  - Checks best practices and maintainability
  - Categorizes findings by severity and effort
  - Offers to fix, plan, or create issues
  - Optional scripts tracking integration

- **`/sessions:configure`** - Plugin configuration command
  - Global model preferences (plan, document, review)
  - Per-project settings (git strategy, docs location, scripts tracking)

- **Scripts tracking** (opt-in)
  - `@session-script` frontmatter standard for agent-generated scripts
  - Lifecycle management: permanent, temporary, deprecated
  - Expiration dates for temporary scripts
  - `/sessions:review` scans for stale/expired scripts

- **`scripts/configure.sh`** - Updates command frontmatter
  - Validates model values (inherit, haiku, sonnet, opus)
  - Handles add, update, and remove operations

- **CLAUDE.md creation** - Auto-created on `/sessions:start`
  - Points Claude to `.sessions/index.md`
  - Lists available session commands
  - Updates existing CLAUDE.md if missing session reference

- **Per-project config** (`.sessions/config.json`)
  - `docsLocation`: `.sessions/docs/` or `docs/` (root)
  - `scriptsTracking`: enabled/disabled

- **Model specifications**
  - Mechanical commands use `model: haiku` (start, end, archive, configure, git-strategy)
  - Thinking commands inherit conversation model (plan, document, review)

### Changed

- **Simplified directory structure**
  - Removed `prep/` - never used in practice
  - Removed `packages/` - unused even in monorepos
  - Removed `.version` - no migration logic needed
  - Removed `WORKSPACE.md` - unnecessary complexity

- **Naming conventions standardized**
  - Archive: `YYYY-MM-DD-<issue>-<topic>.md`
  - Plans: `<issue>-<topic>.md`
  - Docs: `<topic>.md`

- **Enhanced index.md template**
  - Added Key Resources section (code references, external links)
  - Added Archived Sessions section (links to archives)

- **Plan lifecycle guidance**
  - Plans are temporary artifacts
  - Delete when implemented, move reference content to docs/

- **Archive improvements**
  - Added Impact section to template
  - Step to clean up completed plans
  - Links in Archived Sessions section

- **Hybrid git strategy simplified**
  - Removed WORKSPACE.md and README.md from whitelist

### Fixed

- Archive naming convention now documented in `archive.md`
- Plan naming convention now documented in `plan.md`

### Migration from create-sessions-dir

1. Install the sessions plugin
2. Existing `.sessions/` directories work as-is
3. Remove old `.claude/commands/` (plugin provides them)
4. Remove old `.claude/skills/` (plugin provides them)
5. Run `/sessions:configure` to set model preferences

## [0.3.x] - Previous (create-sessions-dir)

See [create-sessions-dir](https://github.com/vieko/create-sessions-dir) for previous history.
