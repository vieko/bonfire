# Bonfire for OpenCode

Session persistence for AI coding - save your progress at the bonfire.

## Installation

**Project install:**

```bash
git clone https://github.com/vieko/bonfire.git /tmp/bonfire
cp -r /tmp/bonfire/opencode/* .opencode/
rm -rf /tmp/bonfire
```

**Global install** (available in all projects):

```bash
git clone https://github.com/vieko/bonfire.git /tmp/bonfire
cp -r /tmp/bonfire/opencode/* ~/.config/opencode/
rm -rf /tmp/bonfire
```

## What's Included

| Component | Description |
|-----------|-------------|
| **8 Commands** | `/bonfire-start`, `/bonfire-end`, `/bonfire-spec`, etc. |
| **4 Agents** | `codebase-explorer`, `spec-writer`, `doc-writer`, `work-reviewer` |
| **1 Skill** | `bonfire-context` for loading session context |
| **1 Plugin** | Archive suggestion hooks |

## Configuration

The `opencode.json` configures automatic context loading:

```json
{
  "instructions": ["CLAUDE.md", ".bonfire/index.md"],
  "plugin": ["./plugin/bonfire-hooks.ts"]
}
```

## Usage

```
/bonfire-start              # Start session, scaffold if needed
/bonfire-end                # Update context, commit changes
/bonfire-spec <topic>       # Create implementation spec
/bonfire-document <topic>   # Document a codebase topic
/bonfire-review             # Find blindspots and gaps
/bonfire-archive            # Archive completed work
/bonfire-configure          # Change project settings
```

## Compatibility

Bonfire uses the same `CLAUDE.md` and `.bonfire/` directory format as the Claude Code version. You can switch between platforms freely.

## Learn More

- [Main README](https://github.com/vieko/bonfire)
- [Blog post](https://vieko.dev/bonfire)
