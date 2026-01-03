---
description: Change project settings (locations, git strategy, Linear)
allowed-tools: Bash(git:*), Read, Write, AskUserQuestion
model: haiku
---

# Configure Sessions

Always runs interactively - asks all configuration questions regardless of arguments.

## Step 1: Find Git Root

Run `git rev-parse --show-toplevel` to locate the repository root.

## Step 2: Check for Sessions Directory

If `<git-root>/.sessions/` does not exist, tell the user to run `/sessions:start` first.

## Step 3: Read Current Config

Read `<git-root>/.sessions/config.json` if it exists to see current settings.

## Step 4: Ask All Configuration Questions

Use AskUserQuestion to ask configuration questions (4 questions, one round):

1. "Where should specs be saved?" (Header: "Specs")
   - .sessions/specs/ (Recommended) - Keep with session context
   - specs/ - Project root level

2. "Where should docs be saved?" (Header: "Docs")
   - .sessions/docs/ (Recommended) - Keep with session context
   - docs/ - Project root level

3. "How should `.sessions/` be handled in git?" (Header: "Git")
   - ignore-all (Recommended) - Keep sessions private/local
   - hybrid - Commit docs/specs, keep notes private
   - commit-all - Share everything with team

4. "Enable Linear MCP integration?" (Header: "Linear")
   - No (Recommended) - Skip Linear integration
   - Yes - Fetch/create Linear issues (requires Linear MCP)

## Step 5: Update Config

**Completely overwrite** `<git-root>/.sessions/config.json` with only these fields (do not preserve old fields like `models`):

```json
{
  "specsLocation": "<user-answer>",
  "docsLocation": "<user-answer>",
  "gitStrategy": "<user-answer>",
  "linearEnabled": <true-or-false>
}
```

## Step 6: Update Git Strategy

If git strategy or locations changed, update `<git-root>/.sessions/.gitignore`:

**Ignore all**:
```
*
!.gitignore
```

**Hybrid** (only include dirs that are inside .sessions/):
```
*
!.gitignore
```
If docsLocation is `.sessions/docs/`, add:
```
!docs/
!docs/**
```
If specsLocation is `.sessions/specs/`, add:
```
!specs/
!specs/**
```

**Commit all**:
```
data/
scratch/
scripts/
```

If switching FROM commit/hybrid TO ignore:
- Warn user that existing tracked files will remain tracked
- Offer to run: `git rm -r --cached .sessions/`

## Step 7: Confirm

Report:
- Settings updated
- Any manual steps needed (git cleanup)
- New configuration summary
