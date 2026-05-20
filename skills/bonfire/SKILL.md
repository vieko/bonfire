---
name: bonfire
description: Session context persistence for AI coding via a `.bonfire/index.md` file convention. This skill is the cross-agent fallback for hosts without a native bonfire adapter (Pi and Claude Code have first-party adapters that auto-update the file; install those when available).
license: MIT
disable-model-invocation: true
allowed-tools: Bash(git:*), Bash(mkdir:*), Bash(ls:*), Read, Write, Edit, Glob, Grep
metadata:
  author: vieko
  version: "7.0.0"
---

# Bonfire (fallback skill)

Session context persistence for AI coding.

Bonfire ships in three layers:

1. **File convention** — `<git-root>/.bonfire/index.md` with two managed fence blocks.
2. **Native host adapters** (preferred) — drop-in plugins that auto-update the file as you work. Available for Pi and Claude Code.
3. **This skill** (fallback) — manual `/skill:bonfire end` for agents without a native adapter (Codex, OpenCode, etc.).

If you're on Pi or Claude Code, install the adapter from `~/dev/bonfire/{pi,claude}/` instead. The adapters are zero-ritual and richer than what this skill can do.

Git root: !`git rev-parse --show-toplevel 2>/dev/null || echo ""`

## Opt-in

The skill (and the adapters) honor an opt-in gate per repo:

```bash
mkdir <repo>/.bonfire
```

Without `.bonfire/` present, this skill exits silently. That keeps it from polluting random repos.

## Routing

| Input | Action |
|-------|--------|
| `end` | Read [commands/end.md](commands/end.md) and execute |

Earlier versions of bonfire had `start` and `handoff` commands. Both are removed in 7.0:

- **`start`**: redundant. Modern agents auto-read files from `cwd`, so `.bonfire/index.md` is already in context. No ritual needed.
- **`handoff`**: Pi has a richer first-party `handoff` extension. For non-Pi agents, use Linear, a notes file consumed via `@file` injection, or a draft PR description.
