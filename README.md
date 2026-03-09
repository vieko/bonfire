# Bonfire

<p align="center">
  <img src="bonfire.gif" alt="Bonfire" width="256">
</p>

Session context persistence for AI coding. Pick up exactly where you left off.

## Installation

```bash
npx skills add vieko/bonfire
```

Works with Claude Code, Cursor, and other [Agent Skills](https://agentskills.io/) compatible tools.

## The Problem

AI agents are stateless. Every conversation starts from scratch. The agent doesn't remember what you decided yesterday, why you chose that architecture, or where you left off.

## The Solution

Bonfire maintains a living context document—read at session start, updated at session end.

```
/bonfire start → work → /bonfire end
```

No complex setup. No external services. Just a Markdown file in your repo.

## Commands

| Command | Outcome |
|---------|---------|
| `/bonfire start` | Session started, context loaded, ready to work |
| `/bonfire end` | Work captured, context healthy |

## What Gets Created

```
.bonfire/
├── index.md      # Living context
└── .gitignore    # Ignored by default
```

## Design

Commands define **outcomes, not procedures**. Each command specifies:
- What success looks like
- How to verify it worked
- Boundaries and constraints

The agent determines the procedure. This follows [ctate's patterns for autonomous agents](https://ctate.com).

## Requirements

- Git repository
- Agent Skills compatible tool

## Links

- [Blog](https://vieko.dev/bonfire)
- [skills.sh](https://skills.sh)
- [agentskills.io](https://agentskills.io)

## Credits

Animation by [Jon Romero Ruiz](https://x.com/jonroru).

## License

MIT © [Vieko Franetovic](https://vieko.dev)
