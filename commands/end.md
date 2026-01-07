---
description: End session - update context and commit changes
allowed-tools: Bash(git:*), Read, Write, Glob, AskUserQuestion
model: haiku
---

# End Session

## Step 1: Find Git Root

Run `git rev-parse --show-toplevel` to locate the repository root.

## Step 2: Review Session Work

Review what was accomplished this session by examining:
- Recent git commits
- Files changed
- Conversation context

## Step 3: Update Session Context

Update `<git-root>/.bonfire/index.md`:

1. Update the session entry with:
   - **Accomplished**: List what was completed
   - **Decisions**: Key decisions made and rationale
   - **Files Modified**: Important files changed (if relevant)
   - **Blockers**: Any issues encountered

2. Update "Next Session Priorities" based on remaining work

3. Update "Current State" to reflect new status

## Step 4: Commit Changes (if tracked)

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

## Step 5: Confirm

Summarize:
- What was documented
- Next priorities
- Any follow-up needed

Let the user know they can run `/bonfire:archive` when this work is merged and complete.
