# Changelog

All notable changes to this project will be documented in this file.

## [0.9.0] - 2026-01-03

### Added

- **doc-writer subagent** - Writes documentation in isolated context (#5)
  - Model: inherit (same as spec-writer)
  - Tools: Read, Write
  - Input: Research findings + topic metadata
  - Output: Complete documentation file
  - `/bonfire:document` now uses doc-writer after codebase-explorer
  - Added doc verification (checks 4 key sections: Overview, Key Files, How It Works, Gotchas)

- **Resumable subagent support** - Multi-pass analysis for large codebases (#6)
  - All subagent-using commands now support resume via Task tool's `resume` parameter
  - When to offer: "X additional items omitted", partial coverage, user requests deeper analysis
  - Up to 3 passes maximum per exploration/review
  - Findings are merged across passes

### Changed

- `/bonfire:document` - Now uses two subagents (explorer → writer) matching spec pattern
- `/bonfire:spec` - Added resumable exploration section
- `/bonfire:review` - Added resumable review section
- Updated plugin.json to include doc-writer agent

## [0.8.2] - 2026-01-03

### Added

- **Subagent error handling** - Graceful fallbacks when subagents fail
  - Progress messages: "Researching codebase...", "Writing spec...", etc.
  - Output validation: Checks subagent returned expected structure
  - Fallback behavior: Falls back to in-context operation on failure
  - File verification: Confirms spec files were actually written
  - Pattern follows established "warn + offer alternative" convention

### Changed

- `/bonfire:spec` - Added research validation and spec verification sections
- `/bonfire:document` - Added exploration validation section
- `/bonfire:review` - Added review validation section

## [0.8.1] - 2026-01-03

### Changed

- Updated plugin description to match README: "AI forgets everything between sessions. Bonfire remembers."

## [0.8.0] - 2026-01-03

### Changed

- **Renamed plugin from "Sessions" to "Bonfire"** - Save-game metaphor inspired by Dark Souls checkpoints
  - All commands: `/sessions:*` → `/bonfire:*`
  - Directory: `.sessions/` → `.bonfire/`
  - Skills: `session-context` → `bonfire-context`, `archive-session` → `archive-bonfire`
  - GitHub repo: vieko/sessions → vieko/bonfire
  - Blog post URL: vieko.dev/sessions → vieko.dev/bonfire

### Why This Change

"Sessions" was functional but not memorable. "Bonfire" evokes the Dark Souls checkpoint mechanic - rest, recover, save progress before heading into the unknown. The metaphor fits the workflow.

### Migration from 0.7.x

Existing `.sessions/` directories will NOT be automatically migrated. To migrate:

1. Rename your `.sessions/` directory to `.bonfire/`
2. Update any hardcoded references in your CLAUDE.md
3. Use new `/bonfire:*` commands

## [0.7.0] - 2026-01-02

### Added

- **Subagent architecture** - Context-efficient operations for heavy commands
  - `codebase-explorer` (haiku) - Fast, isolated codebase research
  - `spec-writer` (inherit) - Synthesizes research + interview into specs
  - `work-reviewer` (sonnet) - Strategic review with categorized findings
  - Subagents ship with plugin in `agents/` directory

### Changed

- **`/bonfire:spec`** - Now uses subagents for research and writing phases
  - Research runs in isolated context, returns structured summary
  - Interview stays in main context with clean state
  - Spec writing runs in isolated context
  - Result: ~70% less main context consumption

- **`/bonfire:document`** - Now uses codebase-explorer subagent
  - Exploration runs in isolated context
  - Only findings summary returns to main context

- **`/bonfire:review`** - Now uses work-reviewer subagent
  - Analysis runs in isolated context (sonnet for depth)
  - Categorized findings return to main context for action decisions

- **Simplified setup** - Removed model configuration questions
  - Subagent models are fixed in agent definitions (not user-configurable)
  - Setup now asks 4 questions in one round (specs, docs, git, Linear)
  - Config.json no longer includes `models` section

- Removed `Glob` and `Grep` from spec/document/review allowed-tools (subagents handle this)
- Restricted `work-reviewer` Bash access to git commands only (read-only analysis)

### Why This Change

Context burns out quickly during spec/document/review operations, requiring shorter sessions and frequent auto-compacting. Subagents isolate heavy research from the main conversation, preserving context for user interaction.

## [0.6.0] - 2025-12-28

### Added

- **Linear MCP integration** - Full issue lifecycle support
  - `/bonfire:start` - Fetch Linear issue context with `ENG-123` or Linear URL
  - `/bonfire:review` - Create Linear issues from findings
  - `/bonfire:archive` - Mark Linear issues as Done when work completes
  - `linearEnabled` config option (opt-in, default false)
  - Graceful degradation when Linear MCP not configured

- **Hybrid spec approach** - Research-informed interviewing for `/bonfire:spec`
  - Step 4: Research phase (patterns, constraints, conflicts)
  - Step 5: Interview phase (3 rounds: core → edge cases → scope)
  - Informed questions based on codebase findings, not generic prompts
  - New spec sections: Context, Decisions, Edge Cases, Out of Scope

### Changed

- `/bonfire:configure` now asks about Linear integration
- Added `mcp__linear__*` to allowed-tools in start, review, and archive commands
- Documented AskUserQuestion 4-question limit in configure and start commands

### Fixed

- Correct Linear MCP tool names: `linear_search_issues`, `linear_create_issue`, `linear_update_issue`
- Archive command uses correct parameter `id` (not `issueId`)

## [0.5.0] - 2025-12-28

### Added

- **Session scripts management** - Location-based script tracking
  - `.bonfire/scripts/` directory for temporary session scripts
  - `/bonfire:end` prompts to keep, move to project, or delete scripts
  - Simple workflow replaces complex `@session-script` frontmatter approach

- **Configurable artifact locations**
  - `specsLocation`: Save specs in `.bonfire/specs/` or project root `specs/`
  - `docsLocation`: Save docs in `.bonfire/docs/` or project root `docs/`
  - Asked during `/bonfire:start` setup and changeable via `/bonfire:configure`

### Changed

- **Renamed `plans/` to `specs/`** - Clearer distinction from Claude Code's plan mode
  - `/bonfire:plan` → `/bonfire:spec`
  - `plans/` directory → `specs/`
  - `models.plan` → `models.spec` in config.json

- **Hardened git operations**
  - Commands never use `git add -f` - respects gitignore
  - Checks if files can be staged before committing
  - Clear messaging when files are gitignored

- **Simplified scripts review in `/bonfire:review`**
  - Removed `scriptsTracking` config option
  - Removed `@session-script` frontmatter requirement
  - Now just lists scripts in `.bonfire/scripts/` that need attention

### Migration from 0.4.x

1. Rename your `plans/` directory to `specs/` (if using hybrid/commit-all git strategy)
2. Update `models.plan` to `models.spec` in `.bonfire/config.json`
3. Run `/bonfire:configure` to set new location preferences

## [0.4.1] - 2025-12-22

### Fixed

- **`/bonfire:configure`** - Now always runs interactively with all 4 questions
- **`/bonfire:end`** - Checks git strategy before committing; skips for `ignore-all`
- **`/bonfire:git-strategy`** - Now uses `AskUserQuestion` for consistent UX
- **`/bonfire:start`** - Aligned question format with configure command
- **`bonfire-context` skill** - Removed references to non-existent `prep/` and `packages/` directories

### Changed

- Removed `scripts/configure.sh` reference from CHANGELOG (was removed in refactor)

## [0.4.0] - 2025-12-22

### Added

- **`/bonfire:review`** - Strategic work review command
  - Identifies blindspots, gaps, quick wins
  - Checks best practices and maintainability
  - Categorizes findings by severity and effort
  - Offers to fix, plan, or create issues
  - Optional scripts tracking integration

- **`/bonfire:configure`** - Plugin configuration command
  - Global model preferences (plan, document, review)
  - Per-project settings (git strategy, docs location, scripts tracking)

- **Scripts tracking** (opt-in)
  - `@session-script` frontmatter standard for agent-generated scripts
  - Lifecycle management: permanent, temporary, deprecated
  - Expiration dates for temporary scripts
  - `/bonfire:review` scans for stale/expired scripts

- **`scripts/configure.sh`** - Updates command frontmatter
  - Validates model values (inherit, haiku, sonnet, opus)
  - Handles add, update, and remove operations

- **CLAUDE.md creation** - Auto-created on `/bonfire:start`
  - Points Claude to `.bonfire/index.md`
  - Lists available bonfire commands
  - Updates existing CLAUDE.md if missing session reference

- **Per-project config** (`.bonfire/config.json`)
  - `docsLocation`: `.bonfire/docs/` or `docs/` (root)
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

1. Install the bonfire plugin
2. Existing `.sessions/` directories need to be renamed to `.bonfire/`
3. Remove old `.claude/commands/` (plugin provides them)
4. Remove old `.claude/skills/` (plugin provides them)
5. Run `/bonfire:configure` to set model preferences

## [0.3.x] - Previous (create-sessions-dir)

See [create-sessions-dir](https://github.com/vieko/create-sessions-dir) for previous history.
