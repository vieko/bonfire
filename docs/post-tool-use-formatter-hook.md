# PostToolUse Formatter Hook

Auto-format files written by Claude Code using your project's formatter.

## Overview

This hook runs after Claude writes or edits files, automatically applying formatting. It respects your project's tooling by checking package.json scripts first, then falling back to config file detection.

## Installation

### 1. Create the hook script

```bash
mkdir -p ~/.claude/hooks
```

Create `~/.claude/hooks/format-claude-output.sh`:

```bash
#!/usr/bin/env bash
#
# PostToolUse hook: Format files written by Claude Code
#

set -euo pipefail

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

[[ -z "$FILE_PATH" || ! -f "$FILE_PATH" ]] && exit 0

if [[ -n "${CLAUDE_PROJECT_DIR:-}" ]]; then
  PROJECT_ROOT="$CLAUDE_PROJECT_DIR"
else
  PROJECT_ROOT=$(cd "$(dirname "$FILE_PATH")" && git rev-parse --show-toplevel 2>/dev/null || echo "")
fi

[[ -z "$PROJECT_ROOT" ]] && exit 0
cd "$PROJECT_ROOT"

has_config() {
  for config in "$@"; do [[ -f "$PROJECT_ROOT/$config" ]] && return 0; done
  return 1
}

# Detect formatter from package.json
FORMATTER=""
if [[ -f "$PROJECT_ROOT/package.json" ]]; then
  format_script=$(jq -r '.scripts.format // empty' "$PROJECT_ROOT/package.json" 2>/dev/null)
  [[ "$format_script" == *"biome"* ]] && FORMATTER="biome"
  [[ "$format_script" == *"prettier"* ]] && FORMATTER="prettier"
fi

# Run detected formatter
case "$FORMATTER" in
  biome)   npx @biomejs/biome format --write "$FILE_PATH" 2>/dev/null || true ;;
  prettier) npx prettier --write "$FILE_PATH" 2>/dev/null || true ;;
  *)
    # Fallback: check config files
    if has_config "biome.json" "biome.jsonc"; then
      npx @biomejs/biome format --write "$FILE_PATH" 2>/dev/null || true
    elif has_config ".prettierrc" ".prettierrc.json" "prettier.config.js"; then
      npx prettier --write "$FILE_PATH" 2>/dev/null || true
    fi
    ;;
esac

exit 0
```

Make executable:

```bash
chmod +x ~/.claude/hooks/format-claude-output.sh
```

### 2. Configure the hook

Add to `~/.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/hooks/format-claude-output.sh"
          }
        ]
      }
    ]
  }
}
```

## How It Works

1. **Triggers** on Write or Edit tool completion
2. **Detects** formatter from package.json `format` script (preferred)
3. **Falls back** to config file detection (biome.json, .prettierrc, etc.)
4. **Runs** the formatter on the specific file
5. **Exits silently** if no formatter found

## Detection Priority

| Priority | Source | Detected By |
|----------|--------|-------------|
| 1 | package.json | `scripts.format` contains "biome" or "prettier" |
| 2 | Config files | biome.json, .prettierrc, prettier.config.js, etc. |

## Testing

Test manually:

```bash
echo '{"tool_input":{"file_path":"/path/to/your/file.ts"}}' | ~/.claude/hooks/format-claude-output.sh
```

## Notes

- Hook adds ~100-500ms latency per Write/Edit operation
- Errors are swallowed (formatter failures won't block Claude)
- Respects `.prettierignore` and formatter-specific ignore files
- Only formats files that exist (handles deletions gracefully)
