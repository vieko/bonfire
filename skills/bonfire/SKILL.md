---
name: bonfire
description: Session context persistence for AI coding. Start/end sessions to maintain context across conversations. Use for session management, "start session", "end session", or questions about previous work, decisions, blockers, "last time", "what we decided".
license: MIT
allowed-tools: Bash(git:*), Bash(mkdir:*), Bash(rm .bonfire/*), Read, Write, Edit, Glob, Grep
metadata:
  author: vieko
  version: "6.1.0"
---

# Bonfire

Session context persistence for AI coding - save your progress at the bonfire.

Git root: !`git rev-parse --show-toplevel`

## Routing

Parse `$ARGUMENTS` to determine action:

| Input | Action |
|-------|--------|
| `start` | Read [commands/start.md](commands/start.md) and execute |
| `end` | Read [commands/end.md](commands/end.md) and execute |
| Empty or context question | Read `<git-root>/.bonfire/index.md`, summarize relevant context, answer |

## Bootstrap

If `.bonfire/index.md` doesn't exist when any command runs, create defaults from [templates/](templates/): `.bonfire/index.md` (session context) and `.bonfire/.gitignore` (ignore all).
