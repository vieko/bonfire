# @vieko/pi-bonfire

Pi adapter for [Bonfire](../README.md).

Auto-updates two managed regions of `<git-root>/.bonfire/index.md` from two sources, in priority order:

1. **Pi's structured compaction summary** (when `session_compact` fires) — Goal / In Progress / Blocked / Next Steps. Best quality, only available when Pi actually compacts the session.
2. **Structured rollup from session entries** (when `session_shutdown` fires) — walks `ctx.sessionManager.getEntries()` to extract Goal (skipping low-signal prompts like "what's next?"), Recent direction, edited/written files, shell/read counts, and the last assistant text block (often a PR/Linear wrap-up). Pure local computation. Robust to upstream compaction bugs and to runtime teardown. Zero LLM cost.

Rows are keyed by session id (`[pi:<8-char-id>]`), so re-compactions of the same session update the same row rather than accumulating.

Zero ritual. Pi runs, the file stays current.

## Install

```bash
pi install git:github.com/vieko/bonfire@v7.1.0
```

Replace `v7.1.0` with `main` to follow the latest unreleased commits, or pin to any tagged version.

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

At session end (`session_shutdown`), the adapter checks the existing row + in-flight for this session. If either is missing, matches the Pi compaction-bug pattern (`/no conversation (content|messages)/i`), or belongs to a different (stale) session, the adapter synthesizes a structured rollup from session entries:

- **Goal** — first user prompt that isn't "what's next?"-style. Filtered against a list of low-signal prompts because users open Pi to *resume* and their first prompt is often meta-conversation.
- **Recent direction** — most recent non-trivial prompt that isn't the goal. Shows the trajectory in long sessions.
- **Done** — written files (new), then edited files, then "Ran N shell commands, read M files". Write-then-edit on the same path is deduped (written wins).
- **Where we left off** — last assistant text block. Often contains PR announcements, Linear filings, or status summaries.
- **Uncommitted** — `git diff --name-only HEAD`.

The rollup is computed by `summarizeSessionEntries()` and only written when `hasEnoughSignal()` is true (≥3 tool events OR a substantive goal). This protects against "user opened Pi, asked 'what's next?', read, quit" from wiping a meaningful prior in-flight.

The fallback is *additive*: if Pi compaction worked, the structured summary wins. The fallback only takes over when the primary path failed or never fired.

## Why both paths

The primary path (compaction) gives richer prose output when Pi's pipeline is healthy. The fallback guarantees bonfire always reflects *something* useful for any session that completed work, including:

- Short sessions that never hit the compaction threshold
- Sessions where Pi's compaction returns garbage due to upstream bugs (cf. [earendil-works/pi#4811](https://github.com/earendil-works/pi/issues/4811))
- Hosts/configurations where compaction is disabled

The entry-based fallback often produces a *better* summary than `ctx.compact()` would: it surfaces the last assistant message verbatim (PR links, Linear IDs, slack one-liners) and uses structured tool-call metadata rather than re-summarizing through an LLM.

## License

MIT
