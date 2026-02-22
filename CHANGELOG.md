# Changelog

All notable changes to this project will be documented in this file.

## [5.0.0] - 2026-02-22

### BREAKING CHANGES

- **`linear` config renamed to `issues`** - Frontmatter setting is now `issues: true/false` instead of `linear: true/false`. Generic name supports any issue tracker (GitHub, Linear, Jira, etc.)

### Removed

- **`sessions-index.json` reading** - Removed all `~/.claude/projects/` path references from start and end commands. Bonfire's own `index.md` already captures session history; the external file was redundant
- **`Bash(gh:*)` from allowed-tools** - The agent already has `gh` access when installed; bonfire doesn't need to declare it
- **`Skill(linear-cli:*)` from allowed-tools** - Eliminates third-party dependency. The agent uses whatever issue tracker tools are available
- **Explicit `MEMORY.md` path references** - Auto-memory is loaded automatically by Claude; the nudge now says "update auto-memory" without naming the file path
- **Optional integrations section from README** - No longer lists specific tool install instructions

### Added

- **Topic parameter sanitization** - Spec, doc, and review commands now require stripping path separators, special characters, and traversal patterns (`../`) from topic parameters before using them as filenames
- **Generic issue tracker language** - Commands reference "configured issue tracker" instead of naming specific tools

### Why This Change

Security audits from Gen Agent Trust Hub (FAIL) and Snyk (WARN) flagged: (1) data exfiltration via `~/.claude/projects/` access, (2) prompt injection via explicit third-party tool references, (3) command execution via `Bash(gh:*)`, (4) external downloads via `Skill(linear-cli:*)`. The fix: remove what bonfire doesn't need. Sessions-index.json was redundant with index.md. Auto-memory is already loaded by Claude. The agent already has `gh` and `linear-cli` if installed. Bonfire just needs to describe outcomes — the agent determines which tools to use.

### Migration

- Rename `linear: true/false` to `issues: true/false` in `.bonfire/index.md` frontmatter
- No other changes needed — issue tracking still works, the agent uses available tools

## [4.3.3] - 2026-01-31

### Fixed

- **Removed date constraints from end command** - Prevents jq date parsing errors
  - Removed "within last 30 minutes" from session matching in `/bonfire end`
  - Removed ">7 days", ">30 days" from garbage detection constraints
  - Changed to qualitative assessment: "orphaned specs, old closed PRs (assess without date filtering)"
  - Session matching now uses most recent `modified` timestamp on current branch (no time window)

### Why This Change

Same root cause as v4.3.1: Hard date requirements (">7 days", "within 30 minutes") tempt agents to use jq date functions like `fromdateiso8601`, which fail on ISO 8601 timestamps with milliseconds. User reported date parsing errors in GTM session when running `/bonfire end`. Following v4.3.1 pattern: remove hard date constraints, let agents assess staleness without date filtering. Same outcome, more robust, no user-facing errors.

### Technical Details

- Updated `skills/bonfire/commands/end.md` lines 27 and 34
- Applied to both repo and installed skill (`~/.claude/skills/bonfire/`)
- Updated spec file (`.bonfire/specs/read-session-summary-on-end.md`) with v4.3.3 notes
- Most recent session on branch is almost certainly the current session (time window unnecessary)
- Garbage detection still effective without exact date math

## [4.3.2] - 2026-01-30

### Added

- **End command reads session summaries** - Establishes symmetry with start command
  - `/bonfire end` now reads current session from `~/.claude/projects` (same data source as start)
  - Matches session by most recent `modified` timestamp within 30 minutes on current branch
  - Extracts baseline: AI-generated `summary`, `messageCount`, `firstPrompt`
  - Enriches with persistent state: git commits, PRs (via `gh`), Linear issues (if enabled), file changes
  - Combines into comprehensive session note with decision context and metadata
  - Gracefully falls back to manual synthesis if session not found

### Why This Change

Start command (v4.3.0) reads from `~/.claude/projects` to show recent sessions. End command now uses the same data source to capture the current session's summary as a baseline, then enriches it with git/GitHub/Linear context. More efficient than manual reconstruction, and establishes read-only symmetry (both commands read from Claude's persistent session data, neither writes to it). Follows "Persist State Explicitly" principle by enriching only with data from persistent sources.

### Technical Details

- Outcome-based constraints added to `skills/bonfire/commands/end.md`
- Uses same directory naming and JSON parsing patterns as start.md (v4.3.1 lessons applied)
- Avoids jq date parsing (uses bash timestamp validation instead)
- Session note format: title from summary + decision paragraph + bullet points (commits/PRs/files) + metadata line
- Implementation spec: `.bonfire/specs/read-session-summary-on-end.md`

## [4.3.1] - 2026-01-30

### Fixed

- **Removed date filtering from session reading** - Simplified `~/.claude/projects` integration
  - Removed "last 7 days max" constraint from `/bonfire start`
  - Date filtering with jq caused parsing errors on ISO 8601 timestamps with milliseconds
  - Now just filters by branch and shows last 3-5 sessions (sorted by modified descending)
  - More robust, same outcome, eliminates parsing complexity

### Why This Change

The date filtering requirement caused agents to implement jq date parsing that failed on milliseconds in ISO 8601 timestamps. The simpler approach (filter by branch, get last N sessions) achieves the same goal without the fragility. Users should never see date parsing errors.

## [4.3.0] - 2026-01-30

### Added

- **Passive session reading on start** - Level 1 `~/.claude/projects` integration
  - `/bonfire start` now automatically displays recent Claude sessions on current branch (last 7 days)
  - Reads from `~/.claude/projects/<project-dir>/sessions-index.json`
  - Shows session summaries with timestamps and message counts
  - Helps agents orient faster by seeing recent work context
  - Progressive enhancement: Level 1 validates value before considering Level 2 (state tracking #36) or Level 3 (search commands #37)

### Changed

- **Improved start command documentation** - Added detailed implementation patterns
  - Project directory naming convention: replace `/` with `-` in absolute paths
  - Complete JSON structure documentation with all field names
  - Filtering logic and display guidelines
  - Graceful error handling when sessions index not found

### Why This Change

"Persist State Explicitly" principle - read persistent session data on every start for efficiency. Agents can see what was discussed and decided in recent sessions without asking, reducing orientation time and improving context continuity.

## [4.2.0] - 2026-01-30

### Changed

- **Config moved to frontmatter** - Consolidated configuration into `index.md`
  - YAML frontmatter replaces separate `config.json` file
  - One file to read instead of two
  - Settings: `specs`, `docs`, `git`, `linear`
  - Updated all commands to reference frontmatter
  - Simplified hybrid git strategy

- **Removed archiving** - Rely on git history for completed work
  - Removed auto-archiving from `/bonfire end`
  - Use "Recent Sessions" section in `index.md` for key decisions
  - Existing archives preserved for historical reference
  - Simplified end command outcome

- **Removed task syncing** - Tasks don't persist across sessions
  - Deleted task setup/sync from start/end commands
  - Removed `Task` from allowed-tools
  - `index.md` is single source of truth for priorities
  - Eliminates redundant busywork

- **Simplified templates** - Cleaner, more focused session context
  - Removed "Archived Sessions" section
  - Removed vague "Notes" section
  - Streamlined "Codemap" structure
  - Reduced template overhead

### Removed

- `config.json` - Merged into `index.md` frontmatter
- `templates/config.json` - No longer needed
- `.bonfire/scripts/` - Empty directory from deprecated feature
- Task syncing logic - Never persisted across sessions

### Migration

For existing projects:
- Add frontmatter to `index.md` with config settings
- Remove `config.json` file
- Archives remain in filesystem (not actively maintained)

## [4.1.0] - 2026-01-29

### Changed

- **Linear integration via skill** - Replaced direct bash commands with linear-cli skill
  - `Bash(linear:*)` → `Skill(linear-cli:*)` in allowed-tools
  - Better command discovery through skill's reference documentation
  - Prevents syntax errors and non-existent function calls
  - Consistent with bonfire's pattern of delegating to specialized skills
  - Installation requires both:
    - CLI: `brew install schpet/tap/linear`
    - Skill: `claude plugin install linear-cli@linear-cli`

## [4.0.0] - 2026-01-26

### BREAKING CHANGES

- **Consolidated to single skill** - 9 skills merged into 1
  - `/bonfire-start` → `/bonfire start`
  - `/bonfire-end` → `/bonfire end`
  - `/bonfire-spec` → `/bonfire spec`
  - `/bonfire-document` → `/bonfire doc`
  - `/bonfire-review` → `/bonfire review`
  - `/bonfire-configure` → `/bonfire config`
- **Commands removed**:
  - `bonfire-review-pr` - Use `gh pr view` and ask for review
  - `bonfire-strategic` - Templates preserved for manual use
  - `bonfire-context` - Merged into main skill as passive trigger
  - Hooks setup - Configure Claude Code hooks manually if needed

### Changed

- **Outcome-based design** - Commands define outcomes, not procedures
  - Inspired by [ctate's patterns for autonomous agents](https://ctate.com)
  - Each command specifies: outcome, acceptance criteria, constraints
  - Agent determines the procedure
  - 88% reduction in instruction size (~1,300 → ~160 lines)

- **Progressive disclosure** - Modular file structure
  - `SKILL.md` - Command routing (~95 lines)
  - `commands/*.md` - Outcome definitions (~20-30 lines each)
  - `templates/` - Default files and document templates

- **Simplified installation** - No `--all` flag needed
  ```bash
  npx skills add vieko/bonfire
  ```

### Added

- **Templates preserved** - RFC, PRD, POC templates in `templates/`
  - Available for manual use or reference
  - Can be used with `/bonfire doc` or `/bonfire spec`

### Migration from 3.x

1. Reinstall: `npx skills add vieko/bonfire`
2. Update command usage:
   - `/bonfire-start` → `/bonfire start`
   - `/bonfire-end` → `/bonfire end`
   - etc.
3. For PR reviews: Use `gh pr view #123` then ask Claude to review
4. For RFC/PRD/POC: Reference templates manually or use `/bonfire doc`
5. Update hooks in `.claude/settings.json` if configured:
   - Replace `/bonfire-archive` with `/bonfire end`
   - Remove any bonfire-specific hooks (now manual)

## [2.0.0] - 2026-01-25

### BREAKING CHANGES

- **Commands migrated to skills** - All `commands/` moved to `skills/` format (SKILL.md)
- **Handoff deprecated** - Use Claude Code Tasks for cross-session work persistence instead
- **Commands consolidated**:
  - `/bonfire:git-strategy` → merged into `/bonfire:configure git`
  - `/bonfire:rfc`, `/bonfire:prd`, `/bonfire:poc` → merged into `/bonfire:strategic <type> <topic>`
- **Agents consolidated**:
  - `spec-writer` + `doc-writer` → merged into `writer`
- **tmux removed** - `review-pr` no longer requires tmux; uses Task tool directly

### Added

- **Tasks integration** - Start and end commands integrate with Claude Code Tasks
  - Tasks provide cross-session work persistence (what to do)
  - index.md provides narrative context (why, decisions, history)
  - Complementary model: use both together

- **Strategic documents command** (`/bonfire:strategic`) - Create RFC, PRD, or POC documents
  - Usage: `/bonfire:strategic rfc <topic>`, `/bonfire:strategic prd <feature>`, `/bonfire:strategic poc <customer>`
  - Shares research → interview → write flow across all types
  - Easy to extend with new document types

- **Configure subcommands** - Quick access to specific settings
  - `/bonfire:configure git` - Change git strategy only
  - `/bonfire:configure linear` - Toggle Linear integration only
  - `/bonfire:configure` - Full interactive config (unchanged)

- **Writer agent** - Unified document writer replacing spec-writer and doc-writer
  - Handles specs, docs, RFCs, PRDs, and POCs
  - Document type passed as context parameter
  - Hidden skill (`user-invocable: false`)

### Changed

- **Skills structure** - 9 user-facing + 3 hidden + 2 passive = 14 total skills
  - User-facing: start, end, spec, document, review, review-pr, archive, configure, strategic
  - Hidden agents: codebase-explorer, writer, work-reviewer
  - Passive triggers: bonfire-context, archive-bonfire

- **review-pr simplified** - No longer spawns tmux session
  - Uses Task tool with work-reviewer directly
  - Worktree still used for file isolation
  - Cross-platform compatible (Windows support)

- **Plugin manifest** - Now uses `skills` array instead of `commands` + `agents`

### Removed

- **Handoff command** - Tasks replaces this functionality
- **git-strategy command** - Use `/bonfire:configure git` instead
- **rfc, prd, poc commands** - Use `/bonfire:strategic <type>` instead
- **spec-writer agent** - Merged into writer
- **doc-writer agent** - Merged into writer
- **handoff-awareness skill** - No longer needed

### Migration from 1.x

1. **Update plugin**: `claude plugin update bonfire`
2. **Handoff users**: Start new sessions normally; Tasks handles work persistence
3. **git-strategy users**: Use `/bonfire:configure git` instead
4. **rfc/prd/poc users**: Use `/bonfire:strategic rfc|prd|poc <topic>` instead
5. **No data migration needed** - `.bonfire/` directory structure unchanged

## [1.5.0] - 2026-01-24

### Changed

- **Outcome-oriented commands** - Refactored `/bonfire:spec` and `/bonfire:document` to use outcome-oriented design
  - Inspired by [Chris Tate's autonomous agent patterns](https://x.com/ctate)
  - Commands define outcomes + acceptance criteria + constraints (not step-by-step procedures)
  - Agent decides execution order and adapts to context
  - 51% reduction in command size (spec: 274→115 lines, document: 180→106 lines)
  - Testing showed better output quality with fewer tool calls

- **Configure creates index.md** - `/bonfire:configure` now creates `.bonfire/` and `index.md` if missing
  - Prevents incomplete state when configure runs before start
  - Any entry point leaves project in usable state

### Added

- **Data protection warning** - README now warns about plugin removal data loss risk
  - Documents that `claude plugin remove` may delete `.bonfire/` directory
  - Recommends `hybrid` or `commit-all` git strategy for important projects

- **Known limitations section** - CLAUDE.md documents design decisions
  - Plugin uninstall data loss (waiting for Claude Code lifecycle hooks)
  - Outcome-oriented command design philosophy

## [1.4.0] - 2026-01-22

### Added

- **PR review command** (`/bonfire:review-pr`, `/bonfire-review-pr`) - Review GitHub PRs with inline comments
  - Creates isolated git worktree for PR branch (keeps current work untouched)
  - Spawns new Claude session in tmux pane for review
  - Runs work-reviewer subagent on PR diff
  - Batch selection of findings to post as comments
  - Posts inline comments via `gh api` on specific files/lines
  - Falls back to general PR comments for files not in diff
  - Offers worktree cleanup when review complete

### Changed

- Updated documentation with new command in command table

## [1.3.0] - 2026-01-21

### Added

- **Session handoff** (`/bonfire:handoff`, `/bonfire-handoff`) - Hand off work to a fresh Claude session
  - Spawns new session in adjacent tmux pane with minimal context (~1K tokens)
  - Updates `index.md` with HANDOFF marker before spawning
  - New session runs `/bonfire:start` to load full history
  - Non-tmux fallback: generates context file with manual instructions

- **Handoff awareness skill** - Detects context concerns and suggests handoff
  - Triggers on phrases like "running out of context", "conversation is getting long"
  - Suggests `/bonfire:handoff` without auto-triggering

- **Context corruption safeguard** - Prevents old sessions from overwriting new session's work
  - Handoff creates marker file `.bonfire/handoff/handed-off`
  - `/bonfire:end` checks for marker and warns before updating `index.md`
  - User can proceed, skip index.md update, or cancel

- **Handoff continuation detection** - New Step 3.5 in `/bonfire:start`
  - Detects and acknowledges when session continues from handoff
  - Reads handoff context for quick orientation
  - Cleans up handoff files after loading

### Changed

- `/bonfire:handoff` now has 10 steps (spawn verification, marker creation)
- `/bonfire:start` now has Step 3.5 for handoff continuation detection
- `/bonfire:end` now has Step 2 for handoff marker check
- Improved shell quoting in tmux spawn command for reliability
- Better size guidance for handoff context (~150 words, ~750 chars)

## [1.2.1] - 2026-01-21

### Added

- **Size warning on start** - Warns when `.bonfire/index.md` exceeds ~20K tokens
  - Displays prominent `=== SESSION CONTEXT TOO LARGE ===` message
  - Prompts user to run `/bonfire:archive` to clean up old sessions
  - Prevents read errors from oversized context files

## [1.2.0] - 2026-01-19

### Added

- **RFC command** (`/bonfire:rfc`, `/bonfire-rfc`) - Create Request for Comments documents
  - Research-informed interview: problem definition, proposed solutions, logistics
  - Vercel-style template: Abstract, Background, Problems, Proposed Solution, Alternatives
  - Stored in docs location (configurable)

- **PRD command** (`/bonfire:prd`, `/bonfire-prd`) - Create Product Requirements Documents
  - Research-informed interview: problem, users, requirements, scope
  - Vercel-style template: Overview, Problem, Audience, Goals, Requirements, Scope
  - 4-round interview covering all PRD aspects

- **POC command** (`/bonfire:poc`, `/bonfire-poc`) - Create Proof of Concept plans
  - Research-informed interview: customer context, goals, timeline, risks
  - Vercel-style template: Context, Goals, Success Criteria, Scope, Timeline
  - Tailored for customer validation scenarios

## [1.1.1] - 2026-01-18

### Fixed

- **PreCompact hook path resolution** - Hook now uses absolute path via `git rev-parse --show-toplevel`
  - Previously used relative path `.bonfire/index.md` which failed when running from subdirectories
  - Fixes "No session context found" error during `/compact` when not at git root

## [1.1.0] - 2026-01-18

### Added

- **PreCompact hook setup (experimental)** - Claude Code users can opt-in to context preservation during compaction
  - New option in `/bonfire:configure`: "Set up context preservation hook?"
  - Creates `.claude/settings.json` with PreCompact hook that outputs index.md before compaction
  - Note: Hook fires before compaction but behavior may vary; OpenCode's plugin hooks are more reliable

- **Codemap section** - Track key files across sessions to reduce exploration burn
  - New section in `index.md` template: Entry Points, Core Components, This Session's Key Files
  - `/bonfire:end` updates "This Session's Key Files" with files referenced during session
  - User-curated Entry Points and Core Components are preserved

- **Review verdict system** - Clearer "ship it" vs "needs work" signals from `/bonfire:review`
  - Output now starts with `## Verdict: APPROVE | CONDITIONAL | BLOCK`
  - Severity counts in summary (Critical, Important, Moderate, Minor)
  - Verdict rationale section explains decision
  - Severity tiers map to verdicts: Critical/Important → BLOCK, Moderate → CONDITIONAL, Minor → APPROVE

### Changed

- `/bonfire:configure` now has 9 steps (was 7) with hook check and setup
- `/bonfire:end` now has 6 steps (was 5) with Codemap update step
- work-reviewer agent output format updated with verdict header

## [1.0.1] - 2026-01-12

### Added

- **Skill-based archive detection for OpenCode** - Added `archive-bonfire-awareness` skill as reliable fallback for PR merge detection
- **Debug logging for hooks** - Temporary console.log to help diagnose hook display issues
- **Dual detection documentation** - Clarified that both platforms use belt-and-suspenders approach

### Changed

- **Hook documentation** - Noted that archive suggestion is handled by both hook and skill for reliability

### Fixed

- **Archive suggestion reliability** - OpenCode now matches Claude Code's pattern-based detection when hooks fail

## [1.0.0] - 2026-01-11

### Added

- **Full OpenCode support** - Bonfire now works with both Claude Code and OpenCode
- **npm distribution** - Install OpenCode version via `bunx opencode-bonfire install`
- **Custom tool for OpenCode** - `bonfire` tool provides structured JSON access to session data
- **Plugin hooks for OpenCode** - Archive suggestions and context preservation during compaction

### Changed

- **Reorganized repository structure** - Separate `claude/` and `opencode/` directories
- **Updated tagline** - Now leads with benefit: "Pick up exactly where you left off"
- **Platform-neutral language** - Removed platform-specific terminology from descriptions

### Fixed

- **OpenCode model IDs** - Updated to use valid `anthropic/claude-haiku-4-5`
- **Plugin initialization** - Fixed hang by removing blocking log calls
- **Model inheritance** - Commands now properly inherit model from config
- **Plugin manifest paths** - Added required `./` prefix to all paths per schema spec

## [0.9.6] - 2026-01-08

### Changed

- **Standardized agent colors** - All subagents now use orange for consistent bonfire branding
- **Renamed `docs/` to `experiments/`** - Clarifies these are research artifacts, not user documentation

### Removed

- **PostToolUse formatter hook recommendation** - Out of scope for Bonfire's core mission (session context management). Users can configure formatters via Claude Code's native hooks if desired.

## [0.9.4] - 2026-01-08

### Added

- **Agent color coding** - Visual identification for subagents in Claude Code UI
  - `codebase-explorer`: teal (research/discovery)
  - `spec-writer`: blue (writing specs)
  - `doc-writer`: blue (writing docs)
  - `work-reviewer`: orange (review/warnings)

## [0.9.3] - 2026-01-07

### Removed

- **Script tracking feature** - Removed unused `.bonfire/scripts/` management
  - Zero usage across multiple projects (bonfire, GTM)
  - Users naturally place scripts in project directories
  - Eliminates complexity without losing functionality

## [0.9.2] - 2026-01-05

### Changed

- **Replaced Linear MCP with linear-cli** - Lower context cost, better developer experience
  - Install: `brew install schpet/tap/linear` then `linear auth`
  - Commands now use `Bash(linear:*)` instead of `mcp__linear__*`
  - ~5x less context (~2KB vs ~10KB) with on-demand discovery via `--help`
  - Bonus: git integration (branch creation from issues)
  - See [linear-cli](https://github.com/schpet/linear-cli) for full documentation

### Migration from 0.9.1

If you use Linear integration:
1. Install linear-cli: `brew install schpet/tap/linear`
2. Authenticate: `linear auth`
3. (Optional) Remove Linear MCP from your Claude Code config

## [0.9.1] - 2026-01-05

### Changed

- Setup questions now use "Default" instead of "Recommended" for option labels
  - Affects `/bonfire:start` (scaffolding) and `/bonfire:configure`
  - Clearer terminology: these are defaults, not recommendations

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
