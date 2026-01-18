---
description: Change project settings (locations, git strategy, Linear)
allowed-tools: Bash(git:*), Read, Write, AskUserQuestion
model: haiku
---

# Configure Bonfire

Always runs interactively - asks all configuration questions regardless of arguments.

## Step 1: Find Git Root

Run `git rev-parse --show-toplevel` to locate the repository root.

## Step 2: Check for Bonfire Directory

If `<git-root>/.bonfire/` does not exist, tell the user to run `/bonfire:start` first.

## Step 3: Read Current Config

Read `<git-root>/.bonfire/config.json` if it exists to see current settings.

## Step 4: Check Existing Hook

Check if `<git-root>/.claude/settings.json` exists and already has a PreCompact hook configured. Store this for Step 5.

## Step 5: Ask All Configuration Questions

Use AskUserQuestion to ask configuration questions (4 questions, one round):

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

**Then ask a second round (1 question):**

5. "Set up context preservation hook?" (Header: "Hooks")
   - No (Default) - Skip hook setup
   - Yes - Preserve session context during compaction

   **Note**: If hook already exists, show: "Yes (already configured)" as first option with description "Hook is already set up"

## Step 6: Update Config

**Completely overwrite** `<git-root>/.bonfire/config.json` with only these fields (do not preserve old fields like `models`):

```json
{
  "specsLocation": "<user-answer>",
  "docsLocation": "<user-answer>",
  "gitStrategy": "<user-answer>",
  "linearEnabled": <true-or-false>
}
```

## Step 7: Update Git Strategy

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

## Step 8: Set Up Context Preservation Hook

**If user answered "Yes" to hook setup AND hook doesn't already exist:**

1. Create `<git-root>/.claude/` directory if it doesn't exist

2. Read existing `<git-root>/.claude/settings.json` if it exists (to preserve other settings)

3. Add or merge the PreCompact hook:

```json
{
  "hooks": {
    "PreCompact": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "echo '## Session Context (preserved before compaction)' && head -100 .bonfire/index.md 2>/dev/null || echo 'No session context found'"
          }
        ]
      }
    ]
  }
}
```

4. If settings.json already has other hooks, merge carefully:
   - Preserve existing PreToolUse, PostToolUse, Stop hooks
   - Add PreCompact array (or append to existing PreCompact if present)

5. Write the merged settings to `<git-root>/.claude/settings.json`

**If hook already exists**: Skip this step, mention it's already configured.

## Step 9: Confirm

Report:
- Settings updated
- Hook status (newly configured, already existed, or skipped)
- Any manual steps needed (git cleanup)
- New configuration summary
