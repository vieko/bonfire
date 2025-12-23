---
description: End session - update context and commit changes
allowed-tools: Bash(git:*), Read, Write
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

Update `<git-root>/.sessions/index.md`:

1. Update the session entry with:
   - **Accomplished**: List what was completed
   - **Decisions**: Key decisions made and rationale
   - **Files Modified**: Important files changed (if relevant)
   - **Blockers**: Any issues encountered

2. Update "Next Session Priorities" based on remaining work

3. Update "Current State" to reflect new status

## Step 4: Commit Changes

Stage and commit the session context:

```bash
git add .sessions/
git commit -m "docs: update session context"
```

If the commit fails, help resolve the issue.

## Step 5: Confirm

Summarize:
- What was documented
- Next priorities
- Any follow-up needed

Let the user know they can run `/sessions:archive` when this work is merged and complete.
