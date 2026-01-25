---
name: configure
description: Change project settings (locations, git strategy, Linear, hooks)
argument-hint: [git | linear | hooks]
disable-model-invocation: true
allowed-tools: Bash(git:*), Read, Write, AskUserQuestion
---

# Configure Bonfire

Change project settings. Supports targeted or full configuration.

Git root: !`git rev-parse --show-toplevel`

## Step 1: Parse Arguments

Based on `$ARGUMENTS`:
- Empty: Full interactive config (all settings)
- `git`: Git strategy only (quick mode)
- `linear`: Linear integration only (quick mode)
- `hooks`: Hooks setup only (quick mode)

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

[Created via /bonfire:configure - run /bonfire:start for full setup]

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

## Step 4: Check Existing Hook

Check if `<git-root>/.claude/settings.json` exists and already has a PreCompact hook configured. Store this for later.

## Step 5: Configuration Mode

### Full Configuration (no arguments)

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

### Quick Mode: Git Strategy Only (`git`)

Present the git strategy options:

1. **Ignore all** - Keep sessions completely local
   - Everything in .bonfire/ is gitignored
   - Most private, nothing shared
   - Good for: solo work, sensitive projects

2. **Hybrid** - Commit docs/specs, keep notes private
   - docs/ and specs/ are committed (if inside .bonfire/)
   - index.md and archive/ stay local
   - Good for: teams that want shared docs but private notes

3. **Commit all** - Share everything with team
   - All session content is committed
   - Only data/ and scratch/ ignored
   - Good for: full transparency, team continuity

Use AskUserQuestion to ask which strategy:

"Which git strategy for `.bonfire/`?" (Header: "Git")
- ignore-all (Recommended) - Keep sessions private/local
- hybrid - Commit docs/specs, keep notes private
- commit-all - Share everything with team

Then update gitStrategy only, preserve other config values.

### Quick Mode: Linear Only (`linear`)

Use AskUserQuestion:

"Enable Linear integration?" (Header: "Linear")
- No - Disable Linear integration
- Yes - Enable Linear (requires linear-cli)

Then update linearEnabled only, preserve other config values.

### Quick Mode: Hooks Only (`hooks`)

Use AskUserQuestion:

"Set up context preservation hook?" (Header: "Hooks")
- No - Skip hook setup
- Yes - Preserve session context during compaction

If hook already exists, note it's already configured.

## Step 6: Update Config

Update `<git-root>/.bonfire/config.json`:

**Full config**: Overwrite with all fields:
```json
{
  "specsLocation": "<user-answer>",
  "docsLocation": "<user-answer>",
  "gitStrategy": "<user-answer>",
  "linearEnabled": <true-or-false>
}
```

**Quick mode**: Merge with existing config, only updating the changed field.

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
            "command": "echo '## Session Context (preserved before compaction)' && head -100 \"$(git rev-parse --show-toplevel)/.bonfire/index.md\" 2>/dev/null || echo 'No session context found'"
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
