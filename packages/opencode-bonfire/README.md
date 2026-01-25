# opencode-bonfire

<p align="center">
  <img src="https://raw.githubusercontent.com/vieko/bonfire/main/bonfire.gif" alt="Bonfire" width="256">
</p>

*Pick up exactly where you left off. Bonfire maintains a living context document across AI coding sessions—read at start, updated at end.*

## Installation

**Project install** (recommended):

```bash
bunx opencode-bonfire install
```

**Global install** (available in all projects):

```bash
bunx opencode-bonfire install --global
```

## What Gets Installed

| Component | Description |
|-----------|-------------|
| **9 Commands** | `/bonfire-start`, `/bonfire-end`, `/bonfire-spec`, `/bonfire-strategic`, `/bonfire-document`, `/bonfire-review`, `/bonfire-review-pr`, `/bonfire-archive`, `/bonfire-configure` |
| **3 Agents** | `codebase-explorer`, `writer`, `work-reviewer` |
| **2 Skills** | `bonfire-context`, `archive-bonfire-awareness` |
| **1 Plugin** | Archive suggestions + compaction context preservation |
| **1 Tool** | `bonfire` for structured session data |

## Usage

```
/bonfire-start                      # Start session, scaffold if needed
/bonfire-end                        # Update context, commit changes
/bonfire-spec <topic>               # Create implementation spec
/bonfire-strategic <type> <topic>   # Create RFC, PRD, or POC
/bonfire-document <topic>           # Document a codebase topic
/bonfire-review                     # Find blindspots and gaps
/bonfire-review-pr <number>         # Review a GitHub PR
/bonfire-archive                    # Archive completed work
/bonfire-configure                  # Change project settings (git, linear)
```

## How It Works

Bonfire creates a `.bonfire/` directory in your project:

```
.bonfire/
├── index.md      # Living context document
├── config.json   # Project settings
├── archive/      # Completed work history
├── specs/        # Implementation specs
└── docs/         # Reference documentation
```

Start each session with `/bonfire-start` to read context. End with `/bonfire-end` to save progress.

## Uninstall

```bash
bunx opencode-bonfire uninstall
# or
bunx opencode-bonfire uninstall --global
```

Note: Your `.bonfire/` data is preserved during uninstall.

## Compatibility

Bonfire uses the same `.bonfire/` directory format as the Claude Code version. You can switch between platforms freely.

## Links

- [GitHub](https://github.com/vieko/bonfire)
- [Blog post](https://vieko.dev/bonfire)

---

Bonfire animation by [Jon Romero Ruiz](https://x.com/jonroru).
