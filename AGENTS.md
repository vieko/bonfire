# AGENTS.md

Guidance for AI coding agents working with this repository.

## What this repo is

Bonfire — a file convention + per-host adapters for cross-session AI coding memory.

```
bonfire/
├── pi/                  # Pi adapter package (TypeScript, jiti runtime)
│   ├── extension.ts     # hooks session_compact + session_shutdown
│   ├── lib.ts           # pure functions (extraction, rendering, fence ops)
│   └── test.mjs         # 86 unit tests
├── claude/              # Claude Code Stop hook (plain ESM JS, no deps)
│   ├── update-bonfire.mjs
│   └── test.mjs         # 18 unit + integration tests
├── skills/bonfire/      # Cross-agent fallback skill
│   ├── SKILL.md         # disable-model-invocation: true
│   ├── commands/end.md  # outcome-oriented spec
│   └── templates/index.md
├── README.md
├── CHANGELOG.md
└── AGENTS.md            # this file
```

## Key invariants

- **Fence format is the contract**: `<!-- bonfire:auto-inflight:start v1 -->` and `<!-- bonfire:auto-sessions:start v1 -->`. Both adapters must produce identical fence shapes; the fallback skill must too. Bump the `v1` suffix only with a coordinated migration.
- **Opt-in gate**: presence of `<git-root>/.bonfire/` directory. Adapters never auto-create it. The opt-in is consciously per-repo.
- **Short session id**: ≥8 random hex chars, skipping UUIDv7 timestamp prefixes. Both adapters use `slice(8, 16)` of the hyphen-stripped UUID.
- **Cap**: 5 newest rows in the sessions fence. Older rows drop.
- **De-dupe by `[<host>:<short-id>]`**: same session updates its row instead of duplicating.
- **Garbage + stale detection**: in-flight from a different session, or matching `/no conversation (content|messages?)/i`, gets overwritten.

## Working in this repo

When changing adapter behavior:
- Both adapters (`pi/`, `claude/`) must stay behaviorally compatible.
- Run tests: `cd pi && node --import=tsx test.mjs`; `cd claude && node test.mjs`.
- Update both READMEs and the top-level README if the user-visible behavior changes.
- Update the fallback skill (`skills/bonfire/commands/end.md`) if the fence shape or short-id rule changes.

When changing skill behavior:
- Keep `disable-model-invocation: true`. The skill should never autoload.
- Keep it outcome-oriented (acceptance criteria, not procedures).

## Session context

This repo dogfoods bonfire. State is in `.bonfire/index.md`.

## Links

- [Pi adapter README](pi/README.md)
- [Claude adapter README](claude/README.md)
- [Skill README](skills/bonfire/SKILL.md)
- [Pi compaction bug draft (file when ready)](.bonfire/pi-bug-draft.md)
