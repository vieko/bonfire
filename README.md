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

### Skills.sh (Universal)

Works with Claude Code, Cursor, Copilot, and other agents:

```bash
npx skills add vieko/bonfire
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
| `/bonfire:end` | `/bonfire-end` | Update context, sync to Tasks |
| `/bonfire:spec <topic>` | `/bonfire-spec <topic>` | Create implementation spec |
| `/bonfire:strategic <type> <topic>` | `/bonfire-strategic <type> <topic>` | Create RFC, PRD, or POC document |
| `/bonfire:document <topic>` | `/bonfire-document <topic>` | Document a codebase topic |
| `/bonfire:review` | `/bonfire-review` | Find blindspots, gaps, quick wins |
| `/bonfire:review-pr <number>` | `/bonfire-review-pr <number>` | Review PR in worktree, post comments |
| `/bonfire:archive` | `/bonfire-archive` | Archive completed work |
| `/bonfire:configure [git\|linear]` | `/bonfire-configure [git\|linear]` | Change project settings |

**Strategic documents**: `/bonfire:strategic rfc auth` creates an RFC, `/bonfire:strategic prd dark-mode` creates a PRD, `/bonfire:strategic poc acme` creates a POC plan.

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

## Smart Archive Reminders

When you merge a PR, Bonfire reminds you to archive completed work:

- **Claude Code**: Detects phrases like "merge it", "shipped", "done with X"
- **OpenCode**: Detects `gh pr merge` commands + same phrases as backup

Both platforms use dual detection for reliability - if one method fails, the other catches it.

## Size Warning

Session context files grow over time. When `index.md` accumulates too many sessions, it can exceed token limits and cause read errors.

**On `/bonfire:start`**: If the file exceeds ~20K tokens, you'll see a prominent warning:

```
=== SESSION CONTEXT TOO LARGE ===

Your .bonfire/index.md is ~25K tokens, which may cause read errors.

Run /bonfire:archive to clean up old sessions.
```

Run `/bonfire:archive` to move completed sessions to `.bonfire/archive/`. All content is preserved, nothing is lost.

## Tasks Integration (Claude Code)

Bonfire integrates with Claude Code's Tasks for cross-session work persistence:

- **Tasks** = Active checklist (what to do next)
- **index.md** = Narrative context (why, decisions, history)

When you run `/bonfire:end`, your "Next Session Priorities" sync to Tasks. Next session, you'll see active tasks without needing to read the full context file.

## Configuration

First run asks you to configure:

| Setting | Options | Default |
|---------|---------|---------|
| Specs location | `.bonfire/specs/` or `specs/` | `.bonfire/specs/` |
| Docs location | `.bonfire/docs/` or `docs/` | `.bonfire/docs/` |
| Git strategy | ignore-all, hybrid, commit-all | ignore-all |
| Linear integration | Yes or No | No |

Change anytime with the configure command.

### Git Strategies

| Strategy | What's tracked | Best for |
|----------|---------------|----------|
| **ignore-all** | Nothing | Solo work, privacy |
| **hybrid** | docs/, specs/ only | Teams wanting shared docs |
| **commit-all** | Everything | Full transparency |

### Data Protection Warning

When uninstalling bonfire via `claude plugin remove`, your `.bonfire/` directory **may be deleted**. Claude Code does not currently support plugin uninstall hooks to prompt for data retention.

**To protect your session data:**

1. Use `hybrid` or `commit-all` git strategy (ensures data is in version control)
2. Or manually backup `.bonfire/` before removing the plugin
3. Or check `~/.Trash` immediately if data is lost (macOS)

This is a [known limitation](https://github.com/anthropics/claude-code/issues/11240) in Claude Code's plugin system.

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
│   └── skills/       # All skills (user-facing + hidden agents)
├── opencode/         # OpenCode plugin
│   ├── command/
│   ├── agent/
│   ├── skill/
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
