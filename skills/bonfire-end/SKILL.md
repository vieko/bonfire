---
name: bonfire-end
description: End session - update context, run health check, and archive completed work
license: MIT
allowed-tools: Bash(git:*), Bash(gh pr view:*), Bash(gh issue view:*), Bash(rm .bonfire/*), Bash(linear:*), Read, Write, Edit, Glob, Grep, AskUserQuestion
metadata:
  author: vieko
  version: "3.1.0"
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

## Step 5: Commit Changes (if tracked)

Read `<git-root>/.bonfire/config.json` to check `gitStrategy`.

**If gitStrategy is "ignore-all"**: Skip committing - nothing is tracked.

**If gitStrategy is "hybrid" or "commit-all"**:

1. Stage unignored files: `git add .bonfire/`
2. Check if anything was staged: `git diff --cached --quiet .bonfire/`
3. If changes staged, commit: `git commit -m "docs: update session context"`

## Step 6: Context Health Check

Run garbage detection and offer actionable cleanup.

### 6.1 Detect Issues

Scan `.bonfire/` for:
- **Broken file references**: Internal links to non-existent files
- **Stale external links**: PRs/issues closed > 30 days ago
- **Orphaned specs**: Unreferenced specs older than 7 days
- **Archive integrity**: Broken links to archived sessions

### 6.2 Build Smart Summaries

For each issue, extract context (title, age, related PR status).

### 6.3 Assign Confidence Levels

- **HIGH**: Spec mentions merged PR, file > 90 days unreferenced, broken link
- **MEDIUM**: 30-90 days unreferenced, stale link > 60 days
- **LOW**: < 30 days, no signals

### 6.4 Offer Cleanup

Prompt for each category with context. Delete/remove based on user choice.

## Step 7: Smart Archive Detection

Detect if session work is ready for archiving.

### 7.1 Check PR Status

If session context references PRs (`#[0-9]+` or `github.com/.*/pull/[0-9]+`):

```bash
gh pr view [NUMBER] --json state,mergedAt,title
```

Track which PRs are merged vs open.

### 7.2 Check Task Completion

Review task list:
- All tasks completed? → completion signal
- Some tasks pending? → note for summary

### 7.3 Check Conversation Signals

Scan conversation for completion language:
- "done", "shipped", "complete", "finished"
- "merged", "closed", "resolved"
- "ready to archive"

### 7.4 Determine Action

**Auto-archive** (proceed without asking) if ANY:
- All referenced PRs are merged
- User explicitly said completion words in this session
- All tasks marked complete

**Prompt with summary** if:
- Mixed state (some PRs merged, some open)
- No clear signals detected
- Session has substantial content but unclear if complete

**Skip archive** if:
- No session content to archive (empty Recent Sessions)
- Work explicitly ongoing ("WIP", "still working on", "not done yet")

### 7.5 Prompt Format (when needed)

Show what would be archived:

```
SESSION COMPLETE?

This session's work:
- PR #30: "Add garbage detection" (merged ✓)
- PR #31: "Actionable cleanup" (merged ✓)
- Spec: context-garbage-detection.md (implemented)

Archive this session? [Y/n]
```

For partial completion:
```
PARTIAL COMPLETION

Completed:
- PR #30: "Add garbage detection" (merged ✓)

Still open:
- PR #31: "Actionable cleanup" (open)

Archive completed work? The open PR will stay in session.
[Y/n]
```

## Step 8: Archive (if triggered)

If Step 7 determined archiving should happen:

### 8.1 Create Archive Entry

Create file: `.bonfire/archive/YYYY-MM-DD-<topic>.md`

Template:
```markdown
# [TOPIC]

**Date**: [DATE]
**Issue**: [ISSUE-ID or N/A]
**PR**: [PR links]
**Status**: Completed

---

## Summary

[Brief description of what was accomplished]

## Accomplished

- [List of completed items]

## Decisions Made

- [Key decisions and rationale]

## Impact

- Files changed: [count]

## Related

- [Links to specs, docs, or code]
```

### 8.2 Clean Up Index

Update `.bonfire/index.md`:
- Remove archived session from Recent Sessions
- Add link to Archived Sessions section
- Update Current State
- If partial archive, keep open work in Recent Sessions

### 8.3 Clean Up Specs

Check specsLocation for implemented specs:
- If spec was fully implemented and archived, delete it
- Archive has the record

### 8.4 Update Linear (if enabled)

Read `linearEnabled` from config. If true and session references Linear issue:

```bash
linear issue update ENG-123 --state "Done"
```

On failure, warn but continue.

### 8.5 Commit Archive (if tracked)

If gitStrategy is "hybrid" or "commit-all":
```bash
git add .bonfire/ && git commit -m "docs: archive completed session"
```

### 8.6 Archive Summary

```
ARCHIVED:
- Session: "Context Garbage Detection"
- PRs: #30, #31 (merged)
- Deleted spec: context-garbage-detection.md
- Added to: archive/2026-01-26-context-garbage-detection.md
```

## Step 9: Confirm

Summarize:
- What was documented
- Tasks synced for next session
- Next priorities
- What was archived (if anything)

```
SESSION ENDED

✓ Context updated
✓ Tasks synced
✓ Health check passed
✓ Archived: "Context Garbage Detection"

Ready for next session. Run /bonfire-start to continue.
```
