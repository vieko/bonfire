---
name: archive
description: Archive completed session work
disable-model-invocation: true
allowed-tools: Bash(git:*), Bash(linear:*), Read, Write, Glob
---

# Archive Session

Git root: !`git rev-parse --show-toplevel`

## Step 1: Review Completed Work

Read `<git-root>/.bonfire/index.md` and identify completed work:
- Sessions with merged PRs
- Completed features/tasks
- Work that's no longer active

## Step 2: Create Archive Entry

Move completed session content to `<git-root>/.bonfire/archive/`.

**Naming convention**: `YYYY-MM-DD-<issue-id>-<topic>.md`

Examples:
- `2025-12-22-GTMENG-387-inbound-improvements.md` (with issue ID)
- `2025-12-22-fix-login-redirect.md` (without issue ID)

Use this template:
```markdown
# [TOPIC]

**Date**: [DATE]
**Issue**: [ISSUE-ID or N/A]
**PR**: [PR link if available]
**Status**: Completed

---

## Summary

[Brief description of what was accomplished]

## Accomplished

- [List of completed items]

## Decisions Made

- [Key decisions and rationale]

## Impact

- [Before/after metrics if applicable]
- Files changed: [count]

## Related

- [Links to related docs, specs, or code]
```

## Step 3: Clean Up Index

Update `<git-root>/.bonfire/index.md`:
- Remove archived session entries from Recent Sessions
- Keep Current State focused on active work
- Update Next Session Priorities
- Add link to archive file in Archived Sessions section:
  ```markdown
  ## Archived Sessions

  - [YYYY-MM-DD - Topic](archive/YYYY-MM-DD-issue-topic.md)
  ```

## Step 4: Clean Up Specs (if applicable)

Read `specsLocation` from `<git-root>/.bonfire/config.json` (default `.bonfire/specs/`).

Check if any specs in the configured location are now complete:
- If the spec was fully implemented, delete the spec file (archive has the record)
- If the spec has reusable reference material, move that content to `docs/` first

## Step 5: Update Linear Issue (if applicable)

Read `<git-root>/.bonfire/config.json` and check `linearEnabled`.

**If `linearEnabled` is true**:

1. Check if archived work references a Linear issue (look in session context for `[A-Z]+-[0-9]+` pattern)
2. If Linear issue found, ask user: "Mark Linear issue [ISSUE-ID] as Done?"
3. If user confirms:
   - Use linear-cli to update the issue:
     ```bash
     linear issue update ENG-123 --state "Done"
     ```
   - Optionally add a comment with link to archive/PR:
     ```bash
     linear issue comment add ENG-123 -b "Archived: [link]"
     ```
4. On failure: Warn user - "Couldn't update Linear issue. You may need to update it manually."

**If `linearEnabled` is false or not set**: Skip this step.

## Step 6: Sync Tasks

Update the Tasks list to reflect archived work:
- Mark completed tasks as done
- Remove tasks that are no longer relevant
- Keep active tasks for ongoing work

## Step 7: Commit Archive (if tracked)

Read `gitStrategy` from `<git-root>/.bonfire/config.json`.

**If gitStrategy is "ignore-all"**: Skip committing - archive is local only.

**If gitStrategy is "hybrid" or "commit-all"**:
1. **NEVER use `git add -f`** - respect gitignore
2. Stage unignored files:
   ```bash
   git add .bonfire/
   ```
3. Check if anything was staged before committing:
   ```bash
   git diff --cached --quiet .bonfire/ || git commit -m "docs: archive completed session work"
   ```

## Step 8: Confirm

Report:
- What was archived
- Any specs cleaned up
- Tasks updated
- Current state of index.md
- Ready for next session
