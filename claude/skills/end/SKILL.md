---
name: end
description: End session - update context and sync to Tasks
disable-model-invocation: true
allowed-tools: Bash(git:*), Read, Write, Glob, AskUserQuestion
---

# End Session

Git root: !`git rev-parse --show-toplevel`

## Step 1: Review Session Work

Review what was accomplished this session by examining:
- Recent git commits
- Files changed
- Conversation context

## Step 2: Update Session Context

Update `<git-root>/.bonfire/index.md`:

1. Update the session entry with:
   - **Accomplished**: List what was completed
   - **Decisions**: Key decisions made and rationale
   - **Files Modified**: Important files changed (if relevant)
   - **Blockers**: Any issues encountered

2. Update "Next Session Priorities" based on remaining work

3. Update "Current State" to reflect new status

## Step 3: Update Codemap

Update the "Codemap" section in `index.md` with files referenced this session:

1. **Identify key files** from this session:
   - Files you read or edited
   - Files mentioned in commits
   - Files central to the work done

2. **Update "This Session's Key Files"**:
   - List up to 10 most relevant files
   - Include brief description of what each does
   - Format: `- \`path/to/file.ts\` - Brief description`

3. **Preserve user-curated sections**:
   - Keep "Entry Points" as-is (user maintains these)
   - Keep "Core Components" as-is (user maintains these)

4. **Keep it concise**:
   - Only include files directly relevant to session work
   - Remove stale entries from previous sessions
   - Max 10 files in "This Session's Key Files"

Example:
```markdown
## Codemap

**Entry Points** (user-curated):
- `src/index.ts` - Main entry

**Core Components** (user-curated):
- `src/commands/` - CLI commands

**This Session's Key Files** (auto-updated):
- `claude/skills/configure/SKILL.md` - Project configuration
- `claude/skills/end/SKILL.md` - Session end workflow
- `.bonfire/specs/feature.md` - Feature specification
```

## Step 4: Sync to Tasks

Sync "Next Session Priorities" to the Tasks system for cross-session persistence:

1. **Convert priorities to tasks**:
   - Each priority in index.md becomes a task
   - Preserve task descriptions and context
   - Mark completed items as done

2. **Task list continuity**:
   - Tasks persist automatically across sessions
   - New session will see these without needing to read index.md
   - index.md provides the "why", Tasks provide the "what"

3. **Keep in sync**:
   - If priority was completed this session, mark task done
   - If new priority emerged, add as new task
   - Don't duplicate existing tasks

**Note**: Tasks complement index.md - they don't replace it. index.md captures decisions, context, and history. Tasks capture actionable work items.

## Step 5: Commit Changes (if tracked)

Read `<git-root>/.bonfire/config.json` to check `gitStrategy`.

**If gitStrategy is "ignore-all"**: Skip committing - nothing is tracked. Tell the user session context was updated locally.

**If gitStrategy is "hybrid" or "commit-all"**:

1. **Check what can be staged**: Run `git status .bonfire/` to see what files are not ignored
2. **NEVER use `git add -f`** - if a file is gitignored, respect that
3. **Stage only unignored files**:
   ```bash
   git add .bonfire/
   ```
4. **Check if anything was staged**: Run `git diff --cached --quiet .bonfire/`
   - If nothing staged (exit code 0), tell user "Session context updated locally (files are gitignored)"
   - If changes staged, commit:
     ```bash
     git commit -m "docs: update session context"
     ```

If the commit fails due to hooks, help resolve the issue (but never bypass hooks with `--no-verify`).

## Step 6: Confirm

Summarize:
- What was documented
- Tasks synced for next session
- Next priorities
- Any follow-up needed

Let the user know they can run `/bonfire:archive` when this work is merged and complete.
