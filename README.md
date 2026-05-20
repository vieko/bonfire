# Bonfire

<p align="center">
  <img src="bonfire.gif" alt="Bonfire" width="256">
</p>

Session context persistence for AI coding. A file convention + per-host adapters. Pick up exactly where you left off, across sessions, agents, and machines.

## The convention

```
<git-root>/.bonfire/
├── index.md
└── .gitignore  (optional — gitignore if you want per-machine memory; commit if you want cross-machine)
```

`index.md` contains two managed fence blocks:

```markdown
# my-repo

<!-- bonfire:auto-inflight:start v1 -->
## In flight

_Updated 2026-05-20 from pi:13e47a9f on `vieko/lead-bot-ash-migration`_

### Goal
PR #147 review prep + GTMENG-1182 calibration

### Next Steps
1. Address inline feedback on classifier
2. Run preflight calibration once classifier is stable
<!-- bonfire:auto-inflight:end -->

<!-- bonfire:auto-sessions:start v1 -->
## Sessions

- 2026-05-20 [pi:13e47a9f] vieko/lead-bot-ash-migration — PR #147 review + calibration
- 2026-05-19 [claude:9a8f1d2e] main — Update AGENTS.md PR convention
<!-- bonfire:auto-sessions:end -->
```

Everything outside the fences is yours to curate. Anything inside is managed by a bonfire adapter.

## Install an adapter

### Pi

```bash
pi install git:github.com/vieko/bonfire/pi@main
```

Hooks `session_compact` (rich structured summary) + `session_shutdown` (first-user-prompt fallback). Footer status, collision-resistant session ids, opt-in per repo. See [pi/](pi/).

### Claude Code

Add to `~/.claude/settings.json` (paste, no install script):

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          { "type": "command", "command": "node /path/to/bonfire/claude/update-bonfire.mjs" }
        ]
      }
    ]
  }
}
```

Reads `{type: "ai-title"}` entries directly from the session JSONL. Idempotent across turns. See [claude/](claude/).

### Other agents (Codex, OpenCode, …)

Use the cross-agent fallback skill:

```bash
npx skills add vieko/bonfire
/skill:bonfire end   # invoke manually at session end
```

See [skills/bonfire/](skills/bonfire/).

## Enable per repo

Adapters honor an opt-in gate — they never auto-create `.bonfire/` in random repos:

```bash
cd <your-repo>
mkdir .bonfire
```

Disable per repo:

```bash
rm -rf .bonfire
```

Or keep `.bonfire/` but disable automation only:

```bash
echo '{ "auto": false }' > .bonfire/config.json
```

## Why?

AI agents are stateless. Every conversation starts from scratch. The agent doesn't remember what you decided yesterday, why you chose that architecture, or where you left off.

Bonfire maintains a living context document — read at session start, updated at session end. No external services. No ritual. Just a markdown file in your repo, kept current by per-host adapters or by the agent itself.

## Design

The three layers serve different audiences:

- **File convention** — works for everyone reading the repo, including humans, future-you, and any AI agent. It's just markdown.
- **Host adapters** (`pi/`, `claude/`) — opinionated TypeScript/JS that uses each host's native hook surface. Zero ritual once installed.
- **Fallback skill** (`skills/bonfire/`) — outcome-oriented spec for agents that lack a native adapter. The agent figures out the procedure.

The adapter writes inside the fence markers and never touches anything else. Your prose, your sections, your headings are yours.

### What lives in `.bonfire/`

`index.md` is the only required file. Everything else inside `.bonfire/` is yours — it's gitignored by default and serves as the personal sidecar dir for the repo. Common patterns:

```
.bonfire/
├── index.md       # required; fence-managed by the adapter
├── BACKLOG.md     # optional; un-ticketed personal follow-ups
├── KNOWLEDGE.md   # optional; durable repo-specific notes (esp. on shared repos where the team's AGENTS.md is off-limits)
├── log.md         # optional; older Sessions rows overflowed from the fence cap
└── config.json    # optional; per-repo settings, e.g. { "auto": false }
```

The sidecar pattern is especially useful for **shared repos** (any repo you don't own): the team's `AGENTS.md` is for the team, but your personal architectural notes, debugging context, and follow-up lists need a home. `.bonfire/` is that home.

Stay disciplined though. The 21 MB cautionary tale: a `.bonfire/` that accumulates audit JSON dumps, ticket-named spec dirs for shipped work, and trim-archive files is a workspace turned graveyard. Periodically prune. If something graduates into team-shared knowledge, promote it to the right canonical home (`docs/`, team `AGENTS.md`, Linear, an RFC) and delete the local copy.

## Requirements

- A git repo (the opt-in gate looks for `<git-root>/.bonfire/`)
- An adapter (preferred) or an Agent Skills-compatible tool (for the fallback skill)

## Credits

Animation by [Jon Romero Ruiz](https://x.com/jonroru).

## License

MIT © [Vieko Franetovic](https://vieko.dev)
