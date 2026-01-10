# Bonfire for OpenCode

Session persistence for AI coding - save your progress at the bonfire.

## Installation

### Option 1: Full Setup (Recommended)

Copy the OpenCode files to your project:

```bash
# Clone the repo
git clone https://github.com/vieko/bonfire.git /tmp/bonfire

# Copy to your project
cp -r /tmp/bonfire/opencode/* /path/to/your/project/.opencode/

# Clean up
rm -rf /tmp/bonfire
```

Or for global installation:

```bash
cp -r /tmp/bonfire/opencode/* ~/.config/opencode/
```

### Option 2: Plugin Only (npm)

If you only want the archive suggestion hooks (not the full command suite):

```json
{
  "plugin": ["opencode-bonfire"]
}
```

This gives you automatic archive suggestions after PR merges, but you'll need to manage session context manually.

## What's Included

| Component | Description |
|-----------|-------------|
| **8 Commands** | `/bonfire-start`, `/bonfire-end`, `/bonfire-spec`, etc. |
| **4 Agents** | `codebase-explorer`, `spec-writer`, `doc-writer`, `work-reviewer` |
| **1 Skill** | `bonfire-context` for loading session context |
| **1 Plugin** | Archive suggestion hooks |

## Configuration

The `opencode.json` configures:

```json
{
  "instructions": ["CLAUDE.md", ".bonfire/index.md"],
  "plugin": ["./plugin/bonfire-hooks.ts"]
}
```

This loads your project's `CLAUDE.md` and bonfire session context automatically.

## Usage

```bash
# Start a session
/bonfire-start

# ... do your work ...

# End the session
/bonfire-end

# Create specs, docs, reviews
/bonfire-spec <topic>
/bonfire-document <topic>
/bonfire-review
```

## Compatibility

Bonfire uses the same `CLAUDE.md` and `.bonfire/` directory format as the Claude Code version. You can switch between platforms freely.

## Learn More

- [Main README](https://github.com/vieko/bonfire)
- [Blog post](https://vieko.dev/bonfire)
