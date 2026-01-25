---
description: Change project settings (locations, git strategy, Linear, hooks)
---

# Configure Bonfire

Change project settings. Supports targeted or full configuration.

## Argument Handling

Based on `$ARGUMENTS`:
- Empty: Full interactive config (all settings)
- `git`: Git strategy only (quick mode - replaces /bonfire-git-strategy)
- `linear`: Linear integration only (quick mode)

## Step 1: Find Git Root

Run `git rev-parse --show-toplevel` to locate the repository root.

## Step 2: Ensure Bonfire Directory Exists

If `<git-root>/.bonfire/` does not exist, create it.

If `<git-root>/.bonfire/index.md` does not exist, create a minimal version:

```markdown
# Session Context: [PROJECT_NAME]

**Date**: [CURRENT_DATE]
**Status**: Active
**Branch**: [CURRENT_BRANCH]

---

## Current State

[Created via /bonfire-configure - run /bonfire-start for full setup]

---

## Recent Sessions

_No sessions recorded yet._

---

## Next Session Priorities

1. [Define your priorities]

---

## Notes

[Add notes here]
```

Detect project name from: package.json name → git remote → directory name.

This ensures configure can be run as the first entry point without leaving the project in an incomplete state.

## Step 3: Read Current Config

Read `<git-root>/.bonfire/config.json` if it exists to see current settings.

## Step 4: Ask All Configuration Questions

Use the question tool to ask configuration questions (4 questions, one round):

1. "Where should specs be saved?" (Header: "Specs")
   - .bonfire/specs/ (Default) - Keep with session context
   - specs/ - Project root level

2. "Where should docs be saved?" (Header: "Docs")
   - .bonfire/docs/ (Default) - Keep with session context
   - docs/ - Project root level

3. "How should `.bonfire/` be handled in git?" (Header: "Git")
   - ignore-all (Default) - Keep sessions private/local
   - hybrid - Commit docs/specs, keep notes private
   - commit-all - Share everything with team

4. "Enable Linear integration?" (Header: "Linear")
   - No (Default) - Skip Linear integration
   - Yes - Fetch/create Linear issues (requires linear-cli)

## Step 5: Update Config

**Completely overwrite** `<git-root>/.bonfire/config.json` with only these fields (do not preserve old fields like `models`):

```json
{
  "specsLocation": "<user-answer>",
  "docsLocation": "<user-answer>",
  "gitStrategy": "<user-answer>",
  "linearEnabled": <true-or-false>
}
```

## Step 6: Update Git Strategy

If git strategy or locations changed, update `<git-root>/.bonfire/.gitignore`:

**Ignore all**:
```
*
!.gitignore
```

**Hybrid** (only include dirs that are inside .bonfire/):
```
*
!.gitignore
```
If docsLocation is `.bonfire/docs/`, add:
```
!docs/
!docs/**
```
If specsLocation is `.bonfire/specs/`, add:
```
!specs/
!specs/**
```

**Commit all**:
```
data/
scratch/
```

If switching FROM commit/hybrid TO ignore:
- Warn user that existing tracked files will remain tracked
- Offer to run: `git rm -r --cached .bonfire/`

## Step 7: Confirm

Report:
- Settings updated
- Any manual steps needed (git cleanup)
- New configuration summary
- Note: Context preservation during compaction is automatic (handled by Bonfire plugin hooks)
