# Sessions Plugin

Claude Code plugin for the Sessions Directory Pattern - maintaining context across AI coding sessions.

## Project Structure

```
sessions/
├── commands/             # Slash commands (/sessions:*)
│   ├── start.md          # Begin session, scaffold if needed (haiku)
│   ├── end.md            # Update context, commit (haiku)
│   ├── plan.md           # Create implementation plan (inherit)
│   ├── document.md       # Document a topic (inherit)
│   ├── review.md         # Strategic work review (inherit)
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
├── config.json   # Project settings (models, git strategy)
├── archive/      # Completed work (YYYY-MM-DD-<issue>-<topic>.md)
├── plans/        # Implementation plans (<issue>-<topic>.md)
├── docs/         # Reference documentation (<topic>.md)
└── .gitignore    # Based on chosen strategy
```

## Configuration

All settings are stored in `.sessions/config.json` per-project:

```json
{
  "models": {
    "plan": "inherit",
    "document": "inherit",
    "review": "opus"
  },
  "gitStrategy": "ignore-all"
}
```

- **models**: Which model to use for thinking commands (inherit, haiku, sonnet, opus)
- **gitStrategy**: How .sessions/ is handled in git (ignore-all, hybrid, commit-all)

Commands read config.json at runtime and respect the model preference.

## Development Notes

- Commands use `$ARGUMENTS` for user input
- All commands start with `git rev-parse --show-toplevel` to find project root
- Skills have trigger patterns in SKILL.md that Claude matches automatically
- Mechanical commands use `model: haiku` for speed
- Thinking commands read config.json for model preference
- Skills cannot specify models (always inherit)
- Version: 0.4.1 (continuing from create-sessions-dir 0.3.x)

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
