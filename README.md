# Sessions

> **v0.5.0** - [Changelog](CHANGELOG.md)

A Claude Code plugin for maintaining context across AI coding sessions.

## What is this?

The **Sessions Directory Pattern** is a workflow for maintaining context with stateless AI agents. Instead of relying on the agent to "remember" previous conversations, you maintain a living document that gets read at session start and updated at session end.

This plugin provides commands and skills that make the pattern seamless.

**Learn more**: [Pairing with a Partner Who Forgets Everything](https://vieko.dev/sessions)

## Installation

```bash
# Add the marketplace
claude plugin marketplace add vieko/sessions

# Install the plugin
claude plugin install sessions@vieko
```

## Commands

All commands are namespaced under `sessions:`:

| Command | Description |
|---------|-------------|
| `/sessions:start` | Start a session - reads context, scaffolds `.sessions/` on first run |
| `/sessions:end` | End session - update context, manage scripts, commit changes |
| `/sessions:spec` | Create an implementation spec |
| `/sessions:document <topic>` | Document a topic in the codebase |
| `/sessions:review` | Review work for blindspots, gaps, and improvements |
| `/sessions:archive` | Archive completed session work |
| `/sessions:configure` | Change project settings |
| `/sessions:git-strategy` | Change how `.sessions/` is handled in git |

## Configuration

On first `/sessions:start`, you'll be asked to configure:

| Setting | Options | Default |
|---------|---------|---------|
| Model for `/spec` | inherit, haiku, sonnet, opus | inherit |
| Model for `/document` | inherit, haiku, sonnet, opus | inherit |
| Model for `/review` | inherit, haiku, sonnet, opus | inherit |
| Specs location | .sessions/specs/, specs/ | .sessions/specs/ |
| Docs location | .sessions/docs/, docs/ | .sessions/docs/ |
| Git strategy | ignore-all, hybrid, commit-all | ignore-all |

Settings are stored in `.sessions/config.json` per-project.

**inherit** uses your current conversation model. Change anytime with `/sessions:configure`.

## Skills (Passive Context)

The plugin includes skills that Claude uses automatically:

### Session Context
Claude automatically reads `.sessions/index.md` when you ask about:
- "What's the project status?"
- "What were we working on?"
- "What decisions have we made?"

### Archive Awareness
Claude suggests archiving when:
- You merge a PR: "merge it", "ship it"
- After successful `gh pr merge`
- You mention completion: "done with X", "shipped"

## Directory Structure

The plugin creates and manages:

```
.sessions/
├── index.md          # Living context document
├── config.json       # Project settings
├── archive/          # Completed work
├── specs/            # Implementation specs (or at project root)
├── docs/             # Topic documentation (or at project root)
├── scripts/          # Temporary session scripts
└── .gitignore        # Based on chosen strategy
```

## Git Strategies

Choose how `.sessions/` is handled:

| Strategy | What's tracked | Best for |
|----------|---------------|----------|
| **Ignore all** | Nothing | Solo work, privacy |
| **Hybrid** | docs/, specs/ only | Teams wanting shared docs |
| **Commit all** | Everything | Full transparency |

Change anytime with `/sessions:git-strategy`.

## Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Archive | `YYYY-MM-DD-<issue>-<topic>.md` | `2025-12-22-GTMENG-387-inbound-improvements.md` |
| Specs | `<issue>-<topic>.md` | `GTMENG-410-webhook-refactor.md` |
| Docs | `<topic>.md` | `inbound-agent-architecture.md` |

Issue IDs are optional but encouraged for traceability.

## Requirements

- [Claude Code CLI](https://claude.ai/code)
- Git repository (for context location)
- `gh` CLI (optional, for GitHub integration)

## Migration from create-sessions-dir

If you used `npx create-sessions-dir` before:

1. Install this plugin
2. Your existing `.sessions/` directory works as-is
3. Old `.claude/commands/` can be removed (plugin provides commands)
4. Old `.claude/skills/` can be removed (plugin provides skills)
5. Run `/sessions:configure` to set up your preferences

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

## License

MIT © [Vieko Franetovic](https://vieko.dev)
