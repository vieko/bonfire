---
description: Archive completed session work
allowed-tools: Bash(git:*), Read, Write, Glob
---

# Archive Session

## Step 1: Find Git Root

Run `git rev-parse --show-toplevel` to locate the repository root.

## Step 2: Review Completed Work

Read `<git-root>/.sessions/index.md` and identify completed work:
- Sessions with merged PRs
- Completed features/tasks
- Work that's no longer active

## Step 3: Create Archive Entry

Move completed session content to `<git-root>/.sessions/archive/`:

Create `YYYY-MM-DD-<topic>.md` with:
- The completed session entries
- Summary of what was accomplished
- Key decisions made
- Links to PRs/commits if available

## Step 4: Clean Up Index

Update `<git-root>/.sessions/index.md`:
- Remove archived session entries
- Keep Current State focused on active work
- Update Next Session Priorities
- Add link to archive file in Notes section

## Step 5: Commit Archive

```bash
git add .sessions/
git commit -m "docs: archive completed session work"
```

## Step 6: Confirm

Report:
- What was archived
- Current state of index.md
- Ready for next session
