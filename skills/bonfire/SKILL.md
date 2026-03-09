---
name: bonfire
description: Session context persistence for AI coding. Start/end sessions to maintain context across conversations. Use for session management, "start session", "end session", or questions about previous work, decisions, blockers, "last time", "what we decided".
license: MIT
allowed-tools: Bash(git:*), Bash(mkdir:*), Bash(rm .bonfire/*), Read, Write, Edit, Glob, Grep
metadata:
  author: vieko
  version: "6.0.0"
---

# Bonfire

Session context persistence for AI coding - save your progress at the bonfire.

Git root: !`git rev-parse --show-toplevel`

## Commands

| Command | Purpose | Details |
|---------|---------|---------|
| `/bonfire start` | Begin session, load context | [commands/start.md](commands/start.md) |
| `/bonfire end` | Save context, health check | [commands/end.md](commands/end.md) |

## Command Routing

Parse `$ARGUMENTS` to determine which command to run:

| Input | Action |
|-------|--------|
| `start` | Read [commands/start.md](commands/start.md) and execute |
| `end` | Read [commands/end.md](commands/end.md) and execute |
| Empty or context question | Read session context and answer |

## Passive Context

When user asks about previous work, decisions, blockers, or references "last time", "previously", "what we decided":

1. Read `<git-root>/.bonfire/index.md`
2. Summarize relevant context
3. Answer the user's question

## Bootstrap

If `.bonfire/index.md` doesn't exist when any command runs, create defaults:

1. Create `.bonfire/` directory
2. Create `index.md` with session context (see [templates/](templates/))
3. Create `.gitignore` (ignore all)

See [templates/](templates/) for default content.

## File Structure

```
.bonfire/
├── index.md          # Session context
└── .gitignore        # Ignore all
```
