# Sessions

A Claude Code plugin for maintaining context across AI coding sessions.

## What is this?

The **Sessions Directory Pattern** is a workflow for maintaining context with stateless AI agents. Instead of relying on the agent to "remember" previous conversations, you maintain a living document that gets read at session start and updated at session end.

This plugin provides commands and skills that make the pattern seamless.

**Learn more**: [Pairing with a Partner Who Forgets Everything](https://vieko.dev/sessions)

## Installation

```bash
# Add the marketplace
/plugin marketplace add vieko/sessions

# Install the plugin
/plugin install sessions
```

Or install directly:

```bash
/plugin install sessions@vieko/sessions
```

## Commands

All commands are namespaced under `sessions:`:

| Command | Description |
|---------|-------------|
| `/sessions:start` | Start a session - reads context, scaffolds `.sessions/` on first run |
| `/sessions:end` | End session - update context and commit changes |
| `/sessions:plan` | Create an implementation plan |
| `/sessions:document <topic>` | Document a topic in the codebase |
| `/sessions:archive` | Archive completed work |
| `/sessions:git-strategy` | Change how `.sessions/` is handled in git |

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

## First Run

On first `/sessions:start`, the plugin will:
1. Detect that `.sessions/` doesn't exist
2. Ask your preferred git strategy (ignore/hybrid/commit)
3. Scaffold the directory structure
4. Detect monorepo if applicable
5. Start your first session

## Directory Structure

The plugin creates and manages:

```
.sessions/
├── index.md          # Living context document
├── archive/          # Completed work
├── plans/            # Implementation plans
├── prep/             # Pre-session context
├── docs/             # Topic documentation
├── packages/         # Monorepo notes (if applicable)
├── .gitignore        # Based on chosen strategy
└── .version          # Plugin version tracking
```

## Git Strategies

Choose how `.sessions/` is handled:

| Strategy | What's tracked | Best for |
|----------|---------------|----------|
| **Ignore all** | Nothing | Solo work, privacy |
| **Hybrid** | docs/, plans/ only | Teams wanting shared docs |
| **Commit all** | Everything | Full transparency |

Change anytime with `/sessions:git-strategy`.

## Requirements

- [Claude Code CLI](https://claude.ai/code)
- Git repository (for context location)
- `gh` CLI (optional, for GitHub integration)

## Why This Works

AI coding agents are stateless - they don't remember previous sessions. The Sessions Directory Pattern solves this by:

1. **Externalizing memory** - Context lives in files, not the agent's "memory"
2. **Progressive documentation** - You document as you build
3. **Continuity across sessions** - Each session starts with full context
4. **Proof of decisions** - Everything is written down

## Migration from npx

If you used `npx create-sessions-dir` before:

1. Install this plugin
2. Your existing `.sessions/` directory works as-is
3. Old `.claude/commands/` can be removed (plugin provides commands)
4. Old `.claude/skills/` can be removed (plugin provides skills)

## License

MIT © [Vieko Franetovic](https://vieko.dev)
