# Bonfire

<p align="center">
  <img src="bonfire.gif" alt="Bonfire" width="256">
</p>

Claude Code forgets everything between conversations. Bonfire remembers.

*A Claude Code plugin that maintains a living context document—read at session start, updated at session end. Pick up exactly where you left off.*

```bash
claude plugin marketplace add vieko/bonfire
claude plugin install bonfire@vieko
```

## The Problem

AI agents are stateless. Every conversation starts from scratch. The agent doesn't remember what you decided yesterday, why you chose that architecture, what blockers you hit, or where you left off.

You end up re-explaining context, re-making decisions, and watching your AI partner repeat the same mistakes.

## The Solution

Bonfire is a Claude Code plugin that maintains a living context document—read at session start, updated at session end. Claude Code picks up exactly where you left off. It's like a saved game for your work.

`/bonfire:start` → *reads context* → WORK → `/bonfire:end` → *saves context*

That's it. No complex setup. No external services. Just Markdown files in your repo.

## Not a Task Tracker

| Tool | Primary Question |
|------|------------------|
| Issue/task trackers | "What's the work?" |
| Bonfire | "Where are we and what did we decide?" |

Bonfire complements your issue tracker. Use GitHub Issues, Linear, Beads, or Beans for tasks. Use Bonfire for workflow context.

## Quick Start

```bash
# Install
claude plugin marketplace add vieko/bonfire
claude plugin install bonfire@vieko

# First run scaffolds .bonfire/ and asks setup questions
/bonfire:start
```

## Commands

| Command | What it does |
|---------|--------------|
| `/bonfire:start` | Read context, scaffold on first run |
| `/bonfire:end` | Update context, commit changes |
| `/bonfire:spec <topic>` | Create implementation spec (researches codebase, interviews you) |
| `/bonfire:document <topic>` | Document a codebase topic |
| `/bonfire:review` | Find blindspots, gaps, and quick wins |
| `/bonfire:archive` | Archive completed work |
| `/bonfire:configure` | Change project settings |

## What Gets Created

```
.bonfire/
├── index.md      # Living context (the important one)
├── config.json   # Your settings
├── archive/      # Completed work history
├── specs/        # Implementation specs
└── docs/         # Topic documentation
```

The `index.md` is where the magic happens. It tracks:

- Current state and branch
- Recent session summaries
- Decisions made and why
- Blockers encountered
- Next priorities

## Context-Efficient Operations

Heavy commands (`/spec`, `/document`, `/review`) use subagents to avoid burning your main conversation context:

- Research runs in isolated context (fast, cheap)
- Only structured summaries return to main conversation
- Result: longer sessions without context exhaustion

This happens automatically.

## Configuration

First `/bonfire:start` asks you to configure:

| Setting | Options |
|---------|---------|
| Specs location | `.bonfire/specs/` or `specs/` |
| Docs location | `.bonfire/docs/` or `docs/` |
| Git strategy | ignore-all, hybrid, commit-all |
| Linear integration | Yes or No |

Change anytime with `/bonfire:configure`.

### Git Strategies

| Strategy | What's tracked | Best for |
|----------|---------------|----------|
| **ignore-all** | Nothing | Solo work, privacy |
| **hybrid** | docs/, specs/ only | Teams wanting shared docs |
| **commit-all** | Everything | Full transparency |

## Linear Integration

If you use Linear for issue tracking:

1. Install [linear-cli](https://github.com/schpet/linear-cli) (`brew install schpet/tap/linear`)
2. Authenticate: `linear auth`
3. Enable via `/bonfire:configure`
4. Reference issues by ID: `ENG-123`

Bonfire will fetch issue context on start, create issues from review findings, and mark issues Done on archive.

**Why linear-cli over Linear MCP?** Lower context cost (~2KB vs ~10KB), on-demand discovery via `--help`, and git integration as a bonus.

## Proactive Skills

Claude Code automatically reads your session context when you ask things like:
- "What's the project status?"
- "What were we working on?"
- "What decisions have we made?"

And suggests archiving when you merge PRs or mention shipping.

## Requirements

- [Claude Code CLI](https://claude.ai/code)
- Git repository

Optional: `gh` CLI for GitHub integration, [linear-cli](https://github.com/schpet/linear-cli) for Linear integration.

## Learn More

**Blog post**: [Save Your Progress](https://vieko.dev/bonfire)

**Changelog**: [CHANGELOG.md](CHANGELOG.md)

## Credits

Bonfire animation by [Jon Romero Ruiz](https://x.com/jonroru).

## License

MIT © [Vieko Franetovic](https://vieko.dev)
