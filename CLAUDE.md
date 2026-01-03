# Sessions Plugin

Claude Code plugin for the Sessions Directory Pattern - maintaining context across AI coding sessions.

## Project Structure

```
sessions/
├── agents/               # Subagents for context-efficient operations
│   ├── codebase-explorer.md  # Fast research (haiku, read-only)
│   ├── spec-writer.md        # Spec synthesis (inherit)
│   └── work-reviewer.md      # Strategic review (sonnet)
├── commands/             # Slash commands (/sessions:*)
│   ├── start.md          # Begin session, scaffold if needed (haiku)
│   ├── end.md            # Update context, commit (haiku)
│   ├── spec.md           # Create implementation spec (uses subagents)
│   ├── document.md       # Document a topic (uses subagents)
│   ├── review.md         # Strategic work review (uses subagents)
│   ├── archive.md        # Archive completed work (haiku)
│   ├── configure.md      # Change project settings (haiku)
│   └── git-strategy.md   # Change git handling (haiku)
├── skills/               # Passive context skills
│   ├── session-context/  # Auto-reads .sessions/index.md
│   └── archive-session/  # Suggests archiving on completion
├── CLAUDE.md             # This file
└── README.md             # User-facing documentation
```

## How It Works

The plugin provides commands that manage a `.sessions/` directory in user projects:

```
.sessions/
├── index.md      # Living context document (read at start, updated at end)
├── config.json   # Project settings (models, locations, git strategy)
├── archive/      # Completed work (YYYY-MM-DD-<issue>-<topic>.md)
├── specs/        # Implementation specs (<issue>-<topic>.md) - location configurable
├── docs/         # Reference documentation (<topic>.md) - location configurable
├── scripts/      # Temporary session scripts (managed at /sessions:end)
└── .gitignore    # Based on chosen strategy
```

## Configuration

All settings are stored in `.sessions/config.json` per-project:

```json
{
  "models": {
    "spec": "inherit",
    "document": "inherit",
    "review": "opus"
  },
  "specsLocation": ".sessions/specs/",
  "docsLocation": ".sessions/docs/",
  "gitStrategy": "ignore-all",
  "linearEnabled": false
}
```

- **models**: Which model to use for thinking commands (inherit, haiku, sonnet, opus)
- **specsLocation**: Where specs are saved (.sessions/specs/ or specs/)
- **docsLocation**: Where docs are saved (.sessions/docs/ or docs/)
- **gitStrategy**: How .sessions/ is handled in git (ignore-all, hybrid, commit-all)
- **linearEnabled**: Enable Linear MCP integration (true/false)

Commands read config.json at runtime and respect the model preference.

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
| `work-reviewer` | sonnet | Strategic review, categorized findings |

## Development Notes

- Commands use `$ARGUMENTS` for user input
- All commands start with `git rev-parse --show-toplevel` to find project root
- Skills have trigger patterns in SKILL.md that Claude matches automatically
- Mechanical commands use `model: haiku` for speed
- Heavy commands use subagents for context efficiency
- Subagent model takes precedence over config.json model settings
- Skills cannot specify models (always inherit)
- Version: 0.7.0 (continuing from create-sessions-dir 0.3.x)

## Testing Changes

1. Make edits to command/skill files
2. Test in a separate project with the plugin installed
3. Run `/sessions:start` to verify scaffolding and config questions
4. Run `/sessions:configure` to verify settings update
5. Run other commands to verify behavior

## Related

- Blog post: https://vieko.dev/sessions
- Original npx package: create-sessions-dir
- GTM project: Real-world usage reference (~/dev/gtm)
