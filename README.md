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

No complex setup. No external services. Just Markdown files in your repo.

## Commands

| Command | Outcome |
|---------|---------|
| `/bonfire start` | Session started, context loaded, ready to work |
| `/bonfire end` | Work captured, context healthy |
| `/bonfire config` | Settings updated to your preferences |
| `/bonfire spec <topic>` | Outcome spec — defines what to build, agent determines how |
| `/bonfire doc <topic>` | Reference documentation for a system or feature |
| `/bonfire review` | Blindspots identified, actionable improvements offered |

## What Gets Created

```
.bonfire/
├── index.md      # Living context (with config in frontmatter)
├── specs/        # Outcome specs
└── docs/         # Documentation
```

## Design

Commands define **outcomes, not procedures**. Each command specifies:
- What success looks like
- How to verify it worked
- Boundaries and constraints

The agent determines the procedure. This follows [ctate's patterns for autonomous agents](https://ctate.com).

## Configuration

Settings live in `index.md` frontmatter:

```yaml
---
specs: .bonfire/specs/
docs: .bonfire/docs/
git: ignore-all
linear: false
---
```

| Setting | Options | Default |
|---------|---------|---------|
| specs | `.bonfire/specs/` or `specs/` | `.bonfire/specs/` |
| docs | `.bonfire/docs/` or `docs/` | `.bonfire/docs/` |
| git | ignore-all, hybrid, commit-all | ignore-all |
| linear | true or false | false |

## Requirements

- Git repository
- Agent Skills compatible tool

**Optional integrations:**
- GitHub: `gh` CLI ([install](https://cli.github.com/))
- Linear: Requires both the CLI and skill
  - CLI: `brew install schpet/tap/linear` ([docs](https://github.com/schpet/linear-cli#install))
  - Skill: `claude plugin install linear-cli@linear-cli` ([docs](https://github.com/schpet/linear-cli#claude-code-skill))

## Links

- [Blog](https://vieko.dev/bonfire)
- [skills.sh](https://skills.sh)
- [agentskills.io](https://agentskills.io)

## Credits

Animation by [Jon Romero Ruiz](https://x.com/jonroru).

## License

MIT © [Vieko Franetovic](https://vieko.dev)
