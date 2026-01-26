# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Cursor, Copilot, etc.) when working with code in this repository.

## Repository Overview

Bonfire provides session context persistence for AI coding - save your progress at the bonfire.

**Installation:**
```bash
npx skills add vieko/bonfire --all
```

The `--all` flag is required to install all 9 skills.

Works with Claude Code, OpenCode, Cursor, and other [Agent Skills](https://agentskills.io) compatible tools.

## Project Structure

```
bonfire/
├── skills/                          # Agent Skills (universal)
│   ├── bonfire-start/SKILL.md
│   ├── bonfire-end/SKILL.md
│   ├── bonfire-spec/SKILL.md
│   ├── bonfire-document/SKILL.md
│   ├── bonfire-review/SKILL.md
│   ├── bonfire-review-pr/SKILL.md
│   ├── bonfire-configure/SKILL.md
│   ├── bonfire-strategic/SKILL.md
│   └── bonfire-context/SKILL.md       # Passive trigger
├── .bonfire/                        # Own session context (dogfooding)
├── AGENTS.md                        # This file
├── CLAUDE.md -> AGENTS.md           # Symlink for Claude discovery
└── README.md
```

## Skills

| Skill | Description |
|-------|-------------|
| `/bonfire-start` | Start session, read context, scaffold if needed |
| `/bonfire-end` | End session, update context, health check, and archive completed work |
| `/bonfire-spec <topic>` | Create implementation spec |
| `/bonfire-document <topic>` | Create reference documentation |
| `/bonfire-review` | Review work for blindspots |
| `/bonfire-review-pr <number>` | Review GitHub PR |
| `/bonfire-configure` | Change project settings |
| `/bonfire-strategic <type> <topic>` | Create RFC, PRD, or POC |

**Passive triggers** (auto-activate on context):
- `bonfire-context` - Reads session context when user asks about previous work

## Architecture

Skills use built-in agents via Task tool:

| Skill | Agent | Purpose |
|-------|-------|---------|
| bonfire-spec, bonfire-document | Explore | Codebase research |
| bonfire-spec, bonfire-document | general-purpose | Document writing |
| bonfire-review, bonfire-review-pr | general-purpose | Code review |

## Contributing

### Skill Naming

- All skills use `bonfire-` prefix to avoid collisions
- Directory name must match the `name:` field in SKILL.md frontmatter
- Use kebab-case: `bonfire-my-skill`

### SKILL.md Format

```yaml
---
name: bonfire-example
description: Brief description of when to use this skill
license: MIT
allowed-tools: Read, Write, Bash(git:*)
metadata:
  author: vieko
  version: "3.0.0"
---

# Skill Title

Instructions for the skill...
```

### Testing Skills

1. Install locally: skills are in `skills/` directory
2. Run the skill: `/bonfire-start`, `/bonfire-end`, etc.
3. Verify behavior matches SKILL.md instructions

## Session Context (.bonfire/)

This repo dogfoods bonfire. Session context is in `.bonfire/index.md`.

Read it to understand:
- Current project state
- Recent work and decisions
- Next priorities

## Related

- [Blog](https://vieko.dev/bonfire)
- [GitHub](https://github.com/vieko/bonfire)
- [skills.sh](https://skills.sh) - Skills directory and installation
- [agentskills.io](https://agentskills.io) - Agent Skills specification
