# Bonfire Plugin

Plugin for maintaining context across AI coding sessions - save your progress at the bonfire.

**Supports both Claude Code and OpenCode.**

## Project Structure

```
bonfire/
├── claude/                   # Claude Code plugin
│   ├── .claude-plugin/
│   │   └── plugin.json       # Plugin manifest
│   ├── agents/               # Subagents
│   │   ├── codebase-explorer.md
│   │   ├── spec-writer.md
│   │   ├── doc-writer.md
│   │   └── work-reviewer.md
│   ├── commands/             # Slash commands (/bonfire:*)
│   │   ├── start.md
│   │   ├── end.md
│   │   ├── spec.md
│   │   ├── rfc.md
│   │   ├── prd.md
│   │   ├── poc.md
│   │   ├── document.md
│   │   ├── review.md
│   │   ├── archive.md
│   │   ├── configure.md
│   │   └── git-strategy.md
│   └── skills/               # Passive triggers
│       ├── bonfire-context/
│       └── archive-bonfire/
├── opencode/                 # OpenCode plugin
│   ├── agent/                # Subagents
│   │   ├── codebase-explorer.md
│   │   ├── spec-writer.md
│   │   ├── doc-writer.md
│   │   └── work-reviewer.md
│   ├── command/              # Slash commands (/bonfire-*)
│   │   ├── bonfire-start.md
│   │   ├── bonfire-end.md
│   │   ├── bonfire-spec.md
│   │   ├── bonfire-rfc.md
│   │   ├── bonfire-prd.md
│   │   ├── bonfire-poc.md
│   │   ├── bonfire-document.md
│   │   ├── bonfire-review.md
│   │   ├── bonfire-archive.md
│   │   ├── bonfire-configure.md
│   │   └── bonfire-git-strategy.md
│   ├── skill/                # On-demand skills
│   │   └── bonfire-context/
│   ├── plugin/               # TypeScript plugin
│   │   └── bonfire-hooks.ts
│   └── opencode.json         # Config manifest
├── .bonfire/                 # Dogfooding - own session context
├── CLAUDE.md                 # This file
└── README.md                 # User documentation
```

## How It Works

Both plugins manage a `.bonfire/` directory in user projects:

```
.bonfire/
├── index.md      # Living context document (read at start, updated at end)
├── config.json   # Project settings (locations, git strategy, Linear)
├── archive/      # Completed work (YYYY-MM-DD-<issue>-<topic>.md)
├── specs/        # Implementation specs (<issue>-<topic>.md)
├── docs/         # Reference documentation (<topic>.md)
└── .gitignore    # Based on chosen strategy
```

The `.bonfire/` data format is **platform-agnostic** - users can switch between Claude Code and OpenCode freely.

## Platform Differences

| Feature | Claude Code | OpenCode |
|---------|-------------|----------|
| Command prefix | `/bonfire:` | `/bonfire-` |
| Rules file | `CLAUDE.md` (native) | `CLAUDE.md` (via `instructions`) |
| Agent config | Frontmatter only | Frontmatter + `mode:`, `hidden:`, `tools:`, `permission:` |
| Model spec | `haiku`/`sonnet` | Full model ID |
| Agent options | N/A | `temperature`, `maxSteps` |
| Skills | Auto-trigger on patterns | On-demand via skill tool |
| Archive detection | Skill-based (reliable) | Skill + Hook (belt & suspenders) |
| Plugin hooks | N/A | TypeScript event hooks (`tool.execute.after`, `experimental.session.compacting`) |
| Custom tools | N/A | TypeScript tool definitions |
| Tool name | `AskUserQuestion` | `question` |

**Note**: Both platforms use `CLAUDE.md` for project rules. OpenCode loads it via the `instructions` config in `opencode.json`. This means one rules file works for both platforms.

## Configuration

All settings stored in `.bonfire/config.json`:

```json
{
  "specsLocation": ".bonfire/specs/",
  "docsLocation": ".bonfire/docs/",
  "gitStrategy": "ignore-all",
  "linearEnabled": false
}
```

## Subagent Architecture

Heavy commands (`spec`, `document`, `review`) use subagents for context efficiency:

```
Main Context (user interaction)
    │
    ├─→ codebase-explorer (haiku, isolated) → returns summary
    │
    ├─→ Interview user (main context, clean)
    │
    └─→ spec-writer (inherit, isolated) → writes file
```

**Subagents:**
| Agent | Model | Purpose |
|-------|-------|---------|
| `codebase-explorer` | haiku | Fast pattern/architecture research |
| `spec-writer` | inherit | Synthesize findings + interview → spec |
| `doc-writer` | inherit | Synthesize findings → documentation |
| `work-reviewer` | sonnet | Strategic review, categorized findings |

## Development Notes

### Claude Code
- Commands use `$ARGUMENTS` for user input
- Skills have trigger patterns that Claude matches automatically
- Model specified as `haiku`, `sonnet`, or `inherit`

### OpenCode
- Commands use `$ARGUMENTS` and positional `$1`, `$2`
- Skills are on-demand (loaded via skill tool)
- Model specified as full ID: `anthropic/claude-haiku-4-20250514`
- Agents use `hidden: true` to hide from `@` menu
- Agent tuning via `temperature`, `maxSteps`
- Agent isolation via `permission: { task: { "*": deny } }`
- Plugin hooks: `tool.execute.after` (archive suggestions), `experimental.session.compacting` (context preservation)
- Custom tool: `bonfire_status` returns structured JSON context

## Testing Changes

### Claude Code
1. Make edits to `claude/` files
2. Test in a separate project with plugin installed
3. Run `/bonfire:start` to verify scaffolding
4. Test other commands

### OpenCode
1. Make edits to `opencode/` files
2. Copy to test project's `.opencode/` directory
3. Run `/bonfire-start` to verify scaffolding
4. Test other commands

## Related

- Blog post: https://vieko.dev/bonfire
- OpenCode docs: https://opencode.ai/docs
- Claude Code: https://claude.ai/code
