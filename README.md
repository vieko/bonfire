# Bonfire

<p align="center">
  <img src="bonfire.gif" alt="Bonfire" width="256">
</p>

Session context persistence for AI coding. Pick up exactly where you left off.

Available on [skills.sh](https://skills.sh). Follows the [Agent Skills](https://agentskills.io/) specification.

## Installation

```bash
npx skills add vieko/bonfire --all
```

The `--all` flag installs all 9 skills. They work together as a system.

Works with Claude Code, Cursor, Copilot, and other Agent Skills compatible tools.

## The Problem

AI agents are stateless. Every conversation starts from scratch. The agent doesn't remember what you decided yesterday, why you chose that architecture, or where you left off.

## The Solution

Bonfire maintains a living context document—read at session start, updated at session end.

```
/bonfire-start → reads context → WORK → /bonfire-end → saves & archives
```

No complex setup. No external services. Just Markdown files in your repo.

## Available Skills

### bonfire-start

Start a session. Reads context, scaffolds `.bonfire/` on first run.

**Use when:**
- Beginning a coding session
- Picking up where you left off
- Starting work on an issue (GitHub or Linear)

### bonfire-end

End a session. Updates context, runs health check, and archives completed work.

**Use when:**
- Finishing a coding session
- Before stepping away from work
- After completing a milestone (auto-detects PR merges)

### bonfire-spec

Create implementation specs for features or tasks.

**Use when:**
- `/bonfire-spec authentication` - Plan auth implementation
- `/bonfire-spec refactor-api` - Plan a refactoring effort

### bonfire-document

Document a topic in the codebase.

**Use when:**
- `/bonfire-document api-patterns` - Document API conventions
- `/bonfire-document deployment` - Document deploy process

### bonfire-strategic

Create strategic documents (RFC, PRD, POC).

**Use when:**
- `/bonfire-strategic rfc auth` - Request for Comments
- `/bonfire-strategic prd dark-mode` - Product Requirements Doc
- `/bonfire-strategic poc acme-corp` - Proof of Concept plan

### bonfire-review

Review work for blindspots, gaps, and improvements.

**Use when:**
- Before creating a PR
- After completing a feature
- `/bonfire-review --session` to review current session

### bonfire-review-pr

Review a GitHub PR in an isolated worktree and post inline comments.

**Use when:**
- `/bonfire-review-pr 123` - Review PR #123

### bonfire-configure

Change project settings.

**Use when:**
- `/bonfire-configure git` - Change git strategy
- `/bonfire-configure linear` - Toggle Linear integration
- `/bonfire-configure hooks` - Set up Claude Code hooks

## Passive Skills

These trigger automatically based on context:

- **bonfire-context** - Reads session context when you ask about previous work

## What Gets Created

```
.bonfire/
├── index.md      # Living context (the important one)
├── config.json   # Your settings
├── archive/      # Completed work history
├── specs/        # Implementation specs
└── docs/         # Topic documentation
```

## Not a Task Tracker

| Tool | Primary Question |
|------|------------------|
| Issue/task trackers | "What's the work?" |
| Bonfire | "Where are we and what did we decide?" |

Bonfire complements your issue tracker. Use GitHub Issues or Linear for tasks. Use Bonfire for workflow context.

## Configuration

First run asks you to configure:

| Setting | Options | Default |
|---------|---------|---------|
| Specs location | `.bonfire/specs/` or `specs/` | `.bonfire/specs/` |
| Docs location | `.bonfire/docs/` or `docs/` | `.bonfire/docs/` |
| Git strategy | ignore-all, hybrid, commit-all | ignore-all |
| Linear integration | Yes or No | No |

### Git Strategies

| Strategy | What's tracked | Best for |
|----------|---------------|----------|
| **ignore-all** | Nothing | Solo work, privacy |
| **hybrid** | docs/, specs/ only | Teams wanting shared docs |
| **commit-all** | Everything | Full transparency |

## Linear Integration

If you use Linear for issue tracking:

1. Install [linear-cli](https://github.com/schpet/linear-cli)
2. Authenticate: `linear auth`
3. Enable via `/bonfire-configure linear`
4. Reference issues by ID: `ENG-123`

## Skill Structure

```
skills/
├── bonfire-start/
│   └── SKILL.md
├── bonfire-strategic/
│   ├── SKILL.md
│   └── references/
│       ├── rfc-template.md
│       ├── prd-template.md
│       └── poc-template.md
└── ...
```

## Requirements

- Git repository
- Agent Skills compatible tool (Claude Code, Cursor, etc.)

Optional: `gh` CLI for GitHub, [linear-cli](https://github.com/schpet/linear-cli) for Linear.

## Learn More

- **Blog**: [Save Your Progress](https://vieko.dev/bonfire)
- **Directory**: [skills.sh](https://skills.sh) - Discover and install skills
- **Spec**: [agentskills.io](https://agentskills.io) - Agent Skills specification

## Credits

Bonfire animation by [Jon Romero Ruiz](https://x.com/jonroru).

## License

MIT © [Vieko Franetovic](https://vieko.dev)
