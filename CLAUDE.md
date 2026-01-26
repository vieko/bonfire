# Bonfire

Session context persistence for AI coding - save your progress at the bonfire.

## Installation

```bash
npx skills add vieko/bonfire
```

Works with Claude Code, OpenCode, Cursor, and other [Agent Skills](https://agentskills.io) compatible tools.

## Project Structure

```
bonfire/
├── skills/                   # Agent Skills (universal)
│   ├── start/SKILL.md
│   ├── end/SKILL.md
│   ├── spec/SKILL.md
│   ├── document/SKILL.md
│   ├── review/SKILL.md
│   ├── review-pr/SKILL.md
│   ├── archive/SKILL.md
│   ├── configure/SKILL.md
│   ├── strategic/SKILL.md
│   ├── bonfire-context/SKILL.md
│   └── archive-bonfire/SKILL.md
├── .bonfire/                 # Own session context (dogfooding)
├── CLAUDE.md
└── README.md
```

## Skills

| Skill | Description |
|-------|-------------|
| `/start` | Start session, read context, scaffold if needed |
| `/end` | End session, update context |
| `/spec <topic>` | Create implementation spec |
| `/document <topic>` | Create reference documentation |
| `/review` | Review work for blindspots |
| `/review-pr <number>` | Review GitHub PR |
| `/archive` | Archive completed work |
| `/configure` | Change project settings |
| `/strategic <type> <topic>` | Create RFC, PRD, or POC |

**Passive triggers**: `bonfire-context`, `archive-bonfire`

## Architecture

Skills use Claude Code's built-in agents via Task tool:

| Skill | Agent | Purpose |
|-------|-------|---------|
| spec, document | Explore | Codebase research |
| spec, document | general-purpose | Document writing |
| review, review-pr | general-purpose | Code review |

## Related

- [Blog](https://vieko.dev/bonfire)
- [GitHub](https://github.com/vieko/bonfire)
- [Agent Skills](https://agentskills.io)
