# Bonfire

<p align="center">
  <img src="bonfire.gif" alt="Bonfire" width="256">
</p>

*Pick up exactly where you left off. Bonfire maintains a living context document across AI coding sessions—read at start, updated at end.*

## Installation

### Claude Code

```bash
claude plugin marketplace add vieko/bonfire
claude plugin install bonfire@vieko
```

### OpenCode

**Project install:**

```bash
bunx opencode-bonfire install
```

**Global install** (available in all projects):

```bash
bunx opencode-bonfire install --global
```

## The Problem

AI agents are stateless. Every conversation starts from scratch. The agent doesn't remember what you decided yesterday, why you chose that architecture, what blockers you hit, or where you left off.

You end up re-explaining context, re-making decisions, and watching your AI partner repeat the same mistakes.

## The Solution

Bonfire maintains a living context document—read at session start, updated at session end. Your AI picks up exactly where you left off. It's like a saved game for your work.

**Claude Code:**
```
/bonfire:start → reads context → WORK → /bonfire:end → saves context
```

**OpenCode:**
```
/bonfire-start → reads context → WORK → /bonfire-end → saves context
```

That's it. No complex setup. No external services. Just Markdown files in your repo.

## Not a Task Tracker

| Tool | Primary Question |
|------|------------------|
| Issue/task trackers | "What's the work?" |
| Bonfire | "Where are we and what did we decide?" |

Bonfire complements your issue tracker. Use GitHub Issues, Linear, or any other tool for tasks. Use Bonfire for workflow context.

## Commands

| Claude Code | OpenCode | What it does |
|-------------|----------|--------------|
| `/bonfire:start` | `/bonfire-start` | Read context, scaffold on first run |
| `/bonfire:end` | `/bonfire-end` | Update context, commit changes |
| `/bonfire:spec <topic>` | `/bonfire-spec <topic>` | Create implementation spec |
| `/bonfire:document <topic>` | `/bonfire-document <topic>` | Document a codebase topic |
| `/bonfire:review` | `/bonfire-review` | Find blindspots, gaps, quick wins |
| `/bonfire:archive` | `/bonfire-archive` | Archive completed work |
| `/bonfire:configure` | `/bonfire-configure` | Change project settings |

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

Heavy commands (`spec`, `document`, `review`) use subagents to avoid burning your main conversation context:

- Research runs in isolated context (fast, cheap)
- Only structured summaries return to main conversation
- Result: longer sessions without context exhaustion

This happens automatically.

## Configuration

First run asks you to configure:

| Setting | Options |
|---------|---------|
| Specs location | `.bonfire/specs/` or `specs/` |
| Docs location | `.bonfire/docs/` or `docs/` |
| Git strategy | ignore-all, hybrid, commit-all |
| Linear integration | Yes or No |

Change anytime with the configure command.

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
3. Enable via configure command
4. Reference issues by ID: `ENG-123`

Bonfire will fetch issue context on start, create issues from review findings, and mark issues Done on archive.

## Platform Differences

| Feature | Claude Code | OpenCode |
|---------|-------------|----------|
| Command prefix | `/bonfire:` | `/bonfire-` |
| Rules file | `CLAUDE.md` (native) | `CLAUDE.md` (via `instructions`) |
| Auto context on start | Via skill trigger | Via `instructions` config |
| Archive suggestion | Via skill trigger | Via plugin hook |
| Plugin format | Markdown only | Markdown + TypeScript |

Both platforms use **`CLAUDE.md`** for project rules and **`.bonfire/`** for session context. You can switch between Claude Code and OpenCode freely—they share the same files.

## Project Structure

```
bonfire/
├── claude/           # Claude Code plugin
│   ├── .claude-plugin/
│   ├── commands/
│   ├── agents/
│   └── skills/
├── opencode/         # OpenCode plugin  
│   ├── command/
│   ├── agent/
│   ├── skill/
│   ├── plugin/
│   └── opencode.json
└── .bonfire/         # Shared context (dogfooding)
```

## Requirements

- [Claude Code CLI](https://claude.ai/code) or [OpenCode](https://opencode.ai)
- Git repository

Optional: `gh` CLI for GitHub integration, [linear-cli](https://github.com/schpet/linear-cli) for Linear integration.

## Learn More

**Blog post**: [Save Your Progress](https://vieko.dev/bonfire)

**Changelog**: [CHANGELOG.md](CHANGELOG.md)

## Credits

Bonfire animation by [Jon Romero Ruiz](https://x.com/jonroru).

## License

MIT © [Vieko Franetovic](https://vieko.dev)
