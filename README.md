# Sessions

> **v0.4.0** - [Changelog](CHANGELOG.md)

A Claude Code plugin for maintaining context across AI coding sessions.

## What is this?

The **Sessions Directory Pattern** is a workflow for maintaining context with stateless AI agents. Instead of relying on the agent to "remember" previous conversations, you maintain a living document that gets read at session start and updated at session end.

This plugin provides commands and skills that make the pattern seamless.

**Learn more**: [Pairing with a Partner Who Forgets Everything](https://vieko.dev/sessions)

## Installation

```bash
# Add the marketplace
claude plugin marketplace add vieko/sessions

# Install the plugin
claude plugin install sessions@viekoslavia
```

## Commands

All commands are namespaced under `sessions:`:

| Command | Description |
|---------|-------------|
| `/sessions:start` | Start a session - reads context, scaffolds `.sessions/` on first run |
| `/sessions:end` | End session - update context and commit changes |
| `/sessions:plan` | Create an implementation plan |
| `/sessions:document <topic>` | Document a topic in the codebase |
| `/sessions:review` | Review work for blindspots, gaps, and improvements |
| `/sessions:archive` | Archive completed session work |
| `/sessions:configure` | Change plugin settings (models, per-project options) |
| `/sessions:git-strategy` | Change how `.sessions/` is handled in git |

## Configuration

### Global Settings (All Projects)

On first use, you'll be asked to configure model preferences:

| Setting | Options | Default |
|---------|---------|---------|
| Model for `/plan` | inherit, haiku, sonnet, opus | inherit |
| Model for `/document` | inherit, haiku, sonnet, opus | inherit |
| Model for `/review` | inherit, haiku, sonnet, opus | inherit |

**inherit** uses your current conversation model. Change anytime with `/sessions:configure`.

### Per-Project Settings

Each project can have its own settings, asked on first `/sessions:start`:

| Setting | Options | Default |
|---------|---------|---------|
| Git strategy | ignore-all, hybrid, commit-all | ignore-all |
| Docs location | .sessions/docs/, docs/ (root) | .sessions/docs/ |
| Scripts tracking | enabled, disabled | disabled |

## Skills (Passive Context)

The plugin includes skills that Claude uses automatically:

### Session Context
Claude automatically reads `.sessions/index.md` when you ask about:
- "What's the project status?"
- "What were we working on?"
- "What decisions have we made?"

### Archive Awareness
Claude suggests archiving when:
- You merge a PR: "merge it", "ship it"
- After successful `gh pr merge`
- You mention completion: "done with X", "shipped"

## Directory Structure

The plugin creates and manages:

```
.sessions/
├── index.md          # Living context document
├── config.json       # Per-project settings
├── archive/          # Completed work
├── plans/            # Implementation plans
├── docs/             # Topic documentation (or at root level)
└── .gitignore        # Based on chosen strategy
```

## Git Strategies

Choose how `.sessions/` is handled:

| Strategy | What's tracked | Best for |
|----------|---------------|----------|
| **Ignore all** | Nothing | Solo work, privacy |
| **Hybrid** | docs/, plans/ only | Teams wanting shared docs |
| **Commit all** | Everything | Full transparency |

Change anytime with `/sessions:git-strategy`.

## Scripts Tracking (Optional)

When enabled, the plugin helps manage agent-generated scripts:

**Frontmatter standard:**
```typescript
/**
 * @session-script
 * @purpose Brief description of what this script does
 * @issue ISSUE-123 (optional)
 * @lifecycle permanent | temporary | deprecated
 * @created 2025-12-22
 * @expires 2025-01-22 (for temporary scripts)
 */
```

`/sessions:review` will scan scripts and identify:
- Untracked scripts (need frontmatter)
- Expired scripts (past expiration date)
- Deprecated scripts (marked for removal)
- Orphaned scripts (reference closed issues)

## Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Archive | `YYYY-MM-DD-<issue>-<topic>.md` | `2025-12-22-GTMENG-387-inbound-improvements.md` |
| Plans | `<issue>-<topic>.md` | `GTMENG-410-webhook-refactor.md` |
| Docs | `<topic>.md` | `inbound-agent-architecture.md` |

Issue IDs are optional but encouraged for traceability.

## Requirements

- [Claude Code CLI](https://claude.ai/code)
- Git repository (for context location)
- `gh` CLI (optional, for GitHub integration)

## Migration from create-sessions-dir

If you used `npx create-sessions-dir` before:

1. Install this plugin
2. Your existing `.sessions/` directory works as-is
3. Old `.claude/commands/` can be removed (plugin provides commands)
4. Old `.claude/skills/` can be removed (plugin provides skills)
5. Run `/sessions:configure` to set up model preferences

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

## License

MIT © [Vieko Franetovic](https://vieko.dev)
