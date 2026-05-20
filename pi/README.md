# @vieko/pi-bonfire

Pi adapter for [Bonfire](../README.md).

Auto-updates two managed regions of `<git-root>/.bonfire/index.md` from two sources, in priority order:

1. **Pi's structured compaction summary** (when `session_compact` fires) — Goal / In Progress / Blocked / Next Steps. Best quality, only available when Pi actually compacts the session.
2. **First user prompt + git context** (when `session_shutdown` fires) — used as a fallback when no compaction fired, or when compaction returned garbage (e.g. the upstream Pi bug that produces `(No conversation content was provided to summarize)`). Always available, zero LLM cost.

Rows are keyed by session id (`[pi:<8-char-id>]`), so re-compactions of the same session update the same row rather than accumulating.

Zero ritual. Pi runs, the file stays current.

## Install

```bash
pi install git:github.com/vieko/bonfire@v7.0.1
```

Replace `v7.0.1` with `main` to follow the latest unreleased commits, or pin to any tagged version.

For local development against a clone of this repo:

```bash
pi install -l /path/to/bonfire/pi
```

(The repo has two `pi-package` manifests: one at the root for git-URL installs, one inside `pi/` for local-path installs. They point at the same extension code.)

## Enable per repo

The adapter is **opt-in per repository**. Installing it globally never causes
`.bonfire/` to materialize in random projects. To enable bonfire in a repo:

```bash
cd <your-repo>
mkdir .bonfire
```

That's it. The next time Pi compacts (auto or `/compact`) in that repo, the
adapter will bootstrap `.bonfire/index.md` from the template and start
maintaining the fences. Disable by `rm -rf .bonfire/`.

## What `.bonfire/index.md` looks like

After bootstrap (file didn't exist):

```markdown
# repo-name

<!-- bonfire:auto-inflight:start v1 -->
## In flight

_No session has compacted in this repo yet. Run Pi until `/compact` fires (auto or manual) and this section will populate from the structured summary._
<!-- bonfire:auto-inflight:end -->

<!-- bonfire:auto-sessions:start v1 -->
## Sessions
<!-- bonfire:auto-sessions:end -->
```

After a few compactions:

```markdown
# repo-name

<!-- bonfire:auto-inflight:start v1 -->
## In flight

_Updated 2026-05-19 from pi:a1b2c3d4 on `main`_

### Goal
Build Bonfire 7.0: file convention + per-host adapters

### In Progress
- Pi extension scaffolded, testing against dotfiles

### Next Steps
1. Test against gtm
2. Port Stop hook to Claude Code
3. Restructure ~/dev/bonfire repo
<!-- bonfire:auto-inflight:end -->

<!-- bonfire:auto-sessions:start v1 -->
## Sessions

- 2026-05-19 [pi:a1b2c3d4] main — Build Bonfire 7.0: file convention + adapters
- 2026-05-18 [pi:f1e2d3c4] vieko/init.lua — nvim 0.11/0.12 cleanup pass
<!-- bonfire:auto-sessions:end -->
```

## Fence rules (important)

The adapter is non-destructive:

- **Bootstraps** `index.md` from a template when `.bonfire/` exists but `index.md` is missing — both fences included.
- **Updates** any fence block it finds.
- **Skips silently** when `.bonfire/` doesn't exist (the opt-in gate).
- **Skips silently** when fences are absent from an existing file. Never injects fences into hand-curated content.

To opt an existing `index.md` into auto-management, add the fence markers wherever you want the content to live. Everything outside the fences is yours.

## Per-repo opt-out

```json
// .bonfire/config.json
{ "auto": false }
```

## When the fallback fires

At session end (`session_shutdown`), the adapter checks the existing row + in-flight for this session. If either is missing or matches the Pi compaction-bug pattern (`/no conversation (content|messages)/i`), the adapter writes a row from the first user prompt + branch + `git diff --name-only HEAD` for the modified files list.

The fallback is *additive*: if Pi compaction worked, the structured summary wins. The fallback only takes over when the primary path failed or never fired.

## Why both paths

The primary path (compaction) gives richer output (Goal, In Progress, Blocked, Next Steps) when Pi's pipeline is healthy. The fallback guarantees bonfire always reflects *something* useful for any session that completed work, including:

- Short sessions that never hit the compaction threshold
- Sessions where Pi's compaction returns garbage due to upstream bugs (cf. `bonfire/.bonfire/pi-bug-draft.md`)
- Hosts/configurations where compaction is disabled

## License

MIT
