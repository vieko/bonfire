---
description: Change project settings (models, locations, git strategy)
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

Use AskUserQuestion to ask configuration questions. Since AskUserQuestion has a 4-question limit, split into two rounds:

### Round 1 (Models + Specs location):

1. "What model for `/sessions:spec`?" (Header: "Spec")
   - inherit (Recommended) - Use conversation model
   - opus - Deep architectural reasoning
   - sonnet - Balanced speed/quality
   - haiku - Fast, lightweight

2. "What model for `/sessions:document`?" (Header: "Document")
   - Same options as above

3. "What model for `/sessions:review`?" (Header: "Review")
   - Same options as above

4. "Where should specs be saved?" (Header: "Specs location")
   - .sessions/specs/ (Recommended) - Keep with session context
   - specs/ - Project root level

### Round 2 (Docs location + Git + Linear):

5. "Where should docs be saved?" (Header: "Docs location")
   - .sessions/docs/ (Recommended) - Keep with session context
   - docs/ - Project root level

6. "How should `.sessions/` be handled in git?" (Header: "Git")
   - ignore-all (Recommended) - Keep sessions private/local
   - hybrid - Commit docs/specs, keep notes private
   - commit-all - Share everything with team

7. "Enable Linear MCP integration?" (Header: "Linear")
   - No (Recommended) - Skip Linear integration
   - Yes - Fetch/create Linear issues (requires Linear MCP)

## Step 5: Update Config

Write the updated `<git-root>/.sessions/config.json`:
```json
{
  "models": {
    "spec": "<user-answer>",
    "document": "<user-answer>",
    "review": "<user-answer>"
  },
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
