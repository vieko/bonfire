# AGENTS.md

Guidance for AI coding agents working with this repository.

## Overview

Bonfire provides session context persistence for AI coding - save your progress at the bonfire.

**Installation:**
```bash
npx skills add vieko/bonfire
```

## Commands

| Command | Outcome |
|---------|---------|
| `/bonfire start` | Session started, context loaded, ready to work |
| `/bonfire end` | Work captured, context healthy, completed work archived |
| `/bonfire config` | Settings updated to user preferences |
| `/bonfire spec <topic>` | Implementation spec that enables building the feature |
| `/bonfire doc <topic>` | Reference documentation for a system or feature |
| `/bonfire review` | Blindspots identified, actionable improvements offered |

## Skill Structure

```
skills/bonfire/
├── SKILL.md              # Command routing
├── commands/             # Outcome definitions
│   ├── start.md
│   ├── end.md
│   ├── config.md
│   ├── spec.md
│   ├── doc.md
│   └── review.md
└── templates/            # Default files
    ├── index.md
    ├── config.json
    ├── rfc.md
    ├── prd.md
    └── poc.md
```

## Design Principles

Commands define **outcomes, not procedures**:
- What success looks like
- How to verify it worked
- Boundaries and constraints

The agent determines the procedure.

## Session Context

This repo uses bonfire. Context is in `.bonfire/index.md`.

## Links

- [skills.sh](https://skills.sh) - Installation
- [agentskills.io](https://agentskills.io) - Specification
