---
name: bonfire
description: Session context persistence for AI coding. Start/end sessions, create outcome specs and docs, review work. Use for session management, "start session", "end session", outcome specs, documentation, code review, or questions about previous work, decisions, blockers, "last time", "what we decided".
license: MIT
allowed-tools: Bash(git:*), Bash(mkdir:*), Bash(rm .bonfire/*), Read, Write, Edit, Glob, Grep, AskUserQuestion
metadata:
  author: vieko
  version: "5.0.0"
---

# Bonfire

Session context persistence for AI coding - save your progress at the bonfire.

Git root: !`git rev-parse --show-toplevel`

## Commands

| Command | Purpose | Details |
|---------|---------|---------|
| `/bonfire start` | Begin session, load context | [commands/start.md](commands/start.md) |
| `/bonfire end` | Save context, health check | [commands/end.md](commands/end.md) |
| `/bonfire config` | Change settings | [commands/config.md](commands/config.md) |
| `/bonfire spec <topic>` | Create outcome spec | [commands/spec.md](commands/spec.md) |
| `/bonfire doc <topic>` | Create documentation | [commands/doc.md](commands/doc.md) |
| `/bonfire review` | Review current work | [commands/review.md](commands/review.md) |

## Command Routing

Parse `$ARGUMENTS` to determine which command to run:

| Input | Action |
|-------|--------|
| `start` | Read [commands/start.md](commands/start.md) and execute |
| `end` | Read [commands/end.md](commands/end.md) and execute |
| `config` or `configure` | Read [commands/config.md](commands/config.md) and execute |
| `spec <topic>` | Read [commands/spec.md](commands/spec.md) and execute |
| `doc <topic>` or `document <topic>` | Read [commands/doc.md](commands/doc.md) and execute |
| `review` | Read [commands/review.md](commands/review.md) and execute |
| Empty or context question | Read session context and answer |

## Passive Context

When user asks about previous work, decisions, blockers, or references "last time", "previously", "what we decided":

1. Read `<git-root>/.bonfire/index.md`
2. Summarize relevant context
3. Answer the user's question

## Bootstrap

If `.bonfire/index.md` doesn't exist when any command runs, create defaults:

1. Create `.bonfire/` with `specs/` and `docs/` subdirectories
2. Create `index.md` with frontmatter config (see [templates/](templates/))
3. Create `.gitignore`

See [templates/](templates/) for default content.

## File Structure

```
.bonfire/
├── index.md          # Session context with config in frontmatter
├── specs/            # Outcome specs
├── docs/             # Documentation
└── .gitignore        # Git strategy
```
