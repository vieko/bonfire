# AGENTS.md

Guidance for AI coding agents working with this repository.

## What this repo is

Bonfire — a file convention + per-host adapters for cross-session AI coding memory.

```
bonfire/
├── pi/                  # Pi adapter package (TypeScript, jiti runtime)
│   ├── extension.ts     # hooks session_compact + session_shutdown
│   ├── lib.ts           # pure functions (extraction, rendering, fence ops)
│   ├── test.mjs         # unit tests
│   └── smoke.mjs        # composition + file-IO smoke test
├── claude/              # Claude Code Stop hook (plain ESM JS, no deps)
│   ├── lib.mjs          # shared fence-contract primitives (importable)
│   ├── update-bonfire.mjs
│   └── test.mjs         # unit + integration tests
├── skills/bonfire/      # Cross-agent fallback skill
│   ├── SKILL.md         # disable-model-invocation: true
│   ├── commands/end.md  # outcome-oriented spec
│   └── templates/index.md
├── conformance.mjs      # cross-producer fence-contract harness
├── README.md
├── CHANGELOG.md
└── AGENTS.md            # this file
```

## Key invariants

- **Fence format is the contract**: `<!-- bonfire:auto-inflight:start v1 -->` and `<!-- bonfire:auto-sessions:start v1 -->`. Both adapters must produce identical fence shapes; the fallback skill must too. Bump the `v1` suffix only with a coordinated migration. **`conformance.mjs` enforces byte-identity** — see the sync contract below.
- **Opt-in gate**: presence of `<git-root>/.bonfire/` directory. Adapters never auto-create it. The opt-in is consciously per-repo.
- **Short session id**: ≥8 random hex chars, skipping UUIDv7 timestamp prefixes. Both adapters use `slice(8, 16)` of the hyphen-stripped UUID.
- **Cap**: 5 newest rows in the sessions fence. Older rows drop.
- **De-dupe by `[<host>:<short-id>]`**: same session updates its row instead of duplicating.
- **Garbage + stale detection**: in-flight from a different session, or matching `/no conversation (content|messages?)/i`, gets overwritten.

## Fence-contract sync contract

The fence mechanics + grammar are duplicated across three producers that must
stay byte-identical. There is no shared runtime (TS adapter, JS adapter, prose
skill), so the duplication is enforced by a **test, not a module**.

| Producer | File(s) | Form |
|----------|---------|------|
| Pi adapter | `pi/lib.ts` (+ row built in `pi/extension.ts`) | TS, exported |
| Claude adapter | `claude/lib.mjs` (+ row/header in `claude/update-bonfire.mjs`) | JS, exported |
| Fallback skill | `skills/bonfire/commands/end.md`, `skills/bonfire/templates/index.md` | prose (not executable) |

**Shared surface — must match across all producers:**
- the four fence markers + `MAX_SESSION_ROWS` + `ONE_LINER_MAX`
- `replaceFence`, `upsertSessionRow`, `shortenSessionId`, `truncate`
- the in-flight attribution header grammar: `` _Updated YYYY-MM-DD from <host>:<short-id> on `<branch>`_ ``
- the sessions row grammar: `- YYYY-MM-DD [<host>:<short-id>] <branch> — <one-liner>`

**NOT shared — intentionally divergent, never assert equality:**
- the in-flight *body* (Pi structured Goal/Progress/Next; Claude `Working on:`; the skill's own shape)

If you touch any shared item, update **all three** producers and run
`tsx conformance.mjs`. The two code adapters are diffed for byte-identical
output; the prose skill is checked against the canonical grammar (the only way
to cover a producer that can't be run). A change to the canonical grammar must
ripple into `end.md` or the harness fails by design.

## Working in this repo

When changing adapter behavior:
- Both adapters (`pi/`, `claude/`) must stay behaviorally compatible — see the sync contract above.
- Run all suites: `npm test` (pi unit + smoke, claude, conformance). Individually: `cd pi && tsx test.mjs && tsx smoke.mjs`; `cd claude && node test.mjs`; `tsx conformance.mjs` from the root.
- `test.mjs` covers lib.ts pure functions; `smoke.mjs` exercises the composed flow that extension.ts uses (rollup + render + fence-replace + upsert + atomic write) against a tmpdir; `conformance.mjs` proves the three producers agree on the shared fence contract.
- Update both READMEs and the top-level README if the user-visible behavior changes.
- Update the fallback skill (`skills/bonfire/commands/end.md`) if the fence shape or short-id rule changes, then re-run `tsx conformance.mjs`.

When changing skill behavior:
- Keep `disable-model-invocation: true`. The skill should never autoload.
- Keep it outcome-oriented (acceptance criteria, not procedures).

## Session context

This repo dogfoods bonfire. State is in `.bonfire/index.md`.

## Links

- [Pi adapter README](pi/README.md)
- [Claude adapter README](claude/README.md)
- [Skill README](skills/bonfire/SKILL.md)
- [Pi compaction bug (filed upstream)](https://github.com/earendil-works/pi/issues/4811)
