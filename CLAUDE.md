# Bonfire Plugin

Claude Code plugin for maintaining context across AI coding sessions - save your progress at the bonfire.

## Project Structure

```
bonfire/
├── agents/               # Subagents for context-efficient operations
│   ├── codebase-explorer.md  # Fast research (haiku, read-only)
│   ├── spec-writer.md        # Spec synthesis (inherit)
│   └── work-reviewer.md      # Strategic review (sonnet)
├── commands/             # Slash commands (/bonfire:*)
│   ├── start.md          # Begin session, scaffold if needed (haiku)
│   ├── end.md            # Update context, commit (haiku)
│   ├── spec.md           # Create implementation spec (uses subagents)
│   ├── document.md       # Document a topic (uses subagents)
│   ├── review.md         # Strategic work review (uses subagents)
│   ├── archive.md        # Archive completed work (haiku)
│   ├── configure.md      # Change project settings (haiku)
│   └── git-strategy.md   # Change git handling (haiku)
├── skills/               # Passive context skills
│   ├── bonfire-context/  # Auto-reads .bonfire/index.md
│   └── archive-bonfire/  # Suggests archiving on completion
├── CLAUDE.md             # This file
└── README.md             # User-facing documentation
```

## How It Works

The plugin provides commands that manage a `.bonfire/` directory in user projects:

```
.bonfire/
├── index.md      # Living context document (read at start, updated at end)
├── config.json   # Project settings (locations, git strategy, Linear)
├── archive/      # Completed work (YYYY-MM-DD-<issue>-<topic>.md)
├── specs/        # Implementation specs (<issue>-<topic>.md) - location configurable
├── docs/         # Reference documentation (<topic>.md) - location configurable
├── scripts/      # Temporary session scripts (managed at /bonfire:end)
└── .gitignore    # Based on chosen strategy
```

## Configuration

All settings are stored in `.bonfire/config.json` per-project:

```json
{
  "specsLocation": ".bonfire/specs/",
  "docsLocation": ".bonfire/docs/",
  "gitStrategy": "ignore-all",
  "linearEnabled": false
}
```

- **specsLocation**: Where specs are saved (.bonfire/specs/ or specs/)
- **docsLocation**: Where docs are saved (.bonfire/docs/ or docs/)
- **gitStrategy**: How .bonfire/ is handled in git (ignore-all, hybrid, commit-all)
- **linearEnabled**: Enable Linear integration via linear-cli (true/false)

## Subagent Architecture

Heavy commands (`spec`, `document`, `review`) use subagents for context efficiency:

```
Main Context (user interaction)
    │
    ├─→ codebase-explorer (haiku, isolated) → returns summary
    │
    ├─→ Interview user (main context, clean)
    │
    └─→ spec-writer (inherit, isolated) → writes file
```

**Benefits:**
- Research doesn't fill main context
- Faster (haiku for exploration)
- Main context stays clean for user interaction

**Subagents:**
| Agent | Model | Purpose |
|-------|-------|---------|
| `codebase-explorer` | haiku | Fast pattern/architecture research |
| `spec-writer` | inherit | Synthesize findings + interview → spec |
| `doc-writer` | inherit | Synthesize findings → documentation |
| `work-reviewer` | sonnet | Strategic review, categorized findings |

## Development Notes

- Commands use `$ARGUMENTS` for user input
- All commands start with `git rev-parse --show-toplevel` to find project root
- Skills have trigger patterns in SKILL.md that Claude matches automatically
- Mechanical commands use `model: haiku` for speed
- Heavy commands use subagents for context efficiency
- Subagent models are fixed in agent definitions (not configurable)
- Skills cannot specify models (always inherit)
- Version: 0.8.0 (renamed from Sessions)

## Testing Changes

1. Make edits to command/skill files
2. Test in a separate project with the plugin installed
3. Run `/bonfire:start` to verify scaffolding and config questions
4. Run `/bonfire:configure` to verify settings update
5. Run other commands to verify behavior

## Related

- Blog post: https://vieko.dev/bonfire
- Original npx package: create-sessions-dir (deprecated)
- GTM project: Real-world usage reference (~/dev/gtm)
