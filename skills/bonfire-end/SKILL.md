---
name: bonfire-end
description: End session - update context and sync to Tasks
license: MIT
allowed-tools: Bash(git:*), Bash(gh pr view:*), Bash(gh issue view:*), Bash(rm .bonfire/*), Read, Write, Edit, Glob, Grep, AskUserQuestion
metadata:
  author: vieko
  version: "3.0.0"
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

## Step 6: Context Health Check

Run garbage detection and offer actionable cleanup.

Tell user: "Running context health check..."

### 6.1 Detect Issues

Scan `.bonfire/` for four categories of issues:

**Broken File References**:
- Extract markdown links from all `.md` files in `.bonfire/`
- Filter to internal paths (exclude http/https)
- Check each path exists relative to `.bonfire/`

**Stale External Links**:
- Find GitHub PR/issue URLs in `.bonfire/*.md` and `.bonfire/**/*.md`
- Check status via `gh pr view [N] --json state,mergedAt,closedAt`
- Stale = MERGED or CLOSED and older than 30 days

**Orphaned Specs**:
- List files in specs location (from config.json, default `.bonfire/specs/`)
- Search for references in `index.md` and `archive/*.md`
- Orphaned = not referenced AND older than 7 days

**Archive Integrity**:
- Extract archive links from "Archived Sessions" section of index.md
- Verify each linked file exists

If `gh` CLI unavailable, skip external link checks and note: "PR status unavailable"

### 6.2 Build Smart Summaries

For each issue, extract context to help user decide:

**For orphaned specs**:
1. Read first 5 lines of file
2. Extract title (first `#` heading or first non-empty line)
3. Search content for PR references (`#[0-9]+` or `pull/[0-9]+`)
4. If PR found, check if merged via `gh pr view`
5. Calculate file age in days

**For stale links**:
1. Get PR/issue title via `gh pr view [N] --json title`
2. Calculate days since merged/closed
3. Identify which section of index.md contains the reference

### 6.3 Assign Confidence Levels

Score each issue for cleanup confidence:

**HIGH confidence** (safe to delete):
- Orphaned spec mentions a PR that is MERGED
- File is > 90 days old AND has zero references
- Broken link (file doesn't exist - always safe to remove reference)

**MEDIUM confidence** (likely safe):
- Orphaned spec is 30-90 days old with no references
- Stale link to merged PR > 60 days old

**LOW confidence** (needs review):
- Orphaned spec < 30 days old
- No signals detected
- Stale link to recently merged PR (30-60 days)

### 6.4 Display Report

Show enhanced report with context:

```
=== CONTEXT HEALTH CHECK ===

✓ File references: [N] checked, [N] broken
✓ External links: [N] checked, [N] stale
✓ Specs: [N] checked, [N] orphaned
✓ Archive integrity: [N] checked, [N] issues

[If issues found:]

CLEANUP AVAILABLE:

HIGH CONFIDENCE (safe to delete):
→ bonfire-rename.md (Jan 3, 5.7KB)
  "Rename sessions to bonfire across codebase"
  ✓ Related PR #23 merged

→ archive/missing.md in index.md
  ✗ File not found (broken link)

NEEDS REVIEW:
→ partial-write-detection.md (Jan 3, 5.4KB)
  "Detect and recover from partial file writes"
  ⚠ No related PR found

STALE LINKS:
→ PR #23 in Key Resources section
  "Rename sessions to bonfire" - merged 45 days ago
```

If no issues: `✓ All clear - no garbage detected`

### 6.5 Offer Cleanup Actions

If issues were found, prompt user for cleanup using AskUserQuestion.

**For HIGH confidence orphaned specs** (if any):
```
Delete [N] orphaned specs? (high confidence - work completed)

Options:
- Yes - Delete all high confidence specs
- Review each - Show details before deleting
- Skip - Keep all files
```

**For LOW confidence specs** (if any):
```
Review [N] specs that need attention?

Options:
- Yes - Review each one
- Skip all - Keep all files
```

**For broken references** (if any):
```
Remove [N] broken links from index.md?

Options:
- Yes - Remove lines with broken links
- No - Keep as-is
```

**For stale PR/issue links** (if any):
```
Remove [N] stale PR references from index.md?
(These PRs were merged/closed 30+ days ago)

Options:
- Yes - Remove stale references
- No - Keep as-is
```

### 6.6 Execute Cleanup

Based on user choices:

**Delete orphaned specs**:
```bash
rm .bonfire/specs/[filename].md
```
Report: "Deleted [filename]"

**Remove broken/stale links from index.md**:
1. Read index.md
2. Find line containing the broken/stale reference
3. Use Edit tool to remove that specific line
4. Report: "Removed reference to [item] from index.md"

**Important**:
- Only delete files in `.bonfire/specs/` or `.bonfire/docs/`
- Never delete files in `.bonfire/archive/` (historical record)
- Only remove specific lines from index.md, don't rewrite sections
- If deletion fails, report error and continue with remaining items

### 6.7 Cleanup Summary

After cleanup actions complete, summarize what was done:

```
CLEANUP COMPLETE:
- Deleted 2 orphaned specs
- Removed 1 broken link from index.md
- Skipped 1 spec (user chose to review later)
```

If user skipped all cleanup: "No cleanup performed. Issues will resurface next session."

## Step 7: Confirm

Summarize:
- What was documented
- Tasks synced for next session
- Next priorities
- Any follow-up needed

Let the user know they can run `/bonfire-archive` when this work is merged and complete.
