# Bonfire — Claude Code adapter

Claude Code Stop hook that auto-updates `<git-root>/.bonfire/index.md` from Claude's own session titles. Reads `{type: "ai-title"}` entries directly from the session's JSONL transcript at `~/.claude/projects/<encoded-cwd>/<sessionId>.jsonl` — the live source-of-truth Claude Code maintains as the session evolves.

Uses the same fence-block contract as the Pi adapter. Both can write to the same file; latest writer wins on the in-flight block.

## How it differs from the Pi adapter

| | Pi | Claude Code |
|---|---|---|
| Triggers on | `session_compact` (compaction event, infrequent) | `Stop` (every assistant turn) |
| Data source | Pi's structured Goal/Progress/Next-Steps summary | Claude's one-line `ai-title` from the session JSONL |
| In-flight content | Full breakdown (Goal / In Progress / Blocked / Next Steps) | Degraded: `Working on: <summary>` only |
| Sessions row | `- date [pi:8chars] branch — Goal first line` | `- date [claude:8chars] branch — summary` |
| Frequency | Once per compaction (rare) | Every turn (frequent, idempotent via no-op-if-unchanged) |

Claude's `ai-title` updates as the session accumulates context, so frequent firing isn't a problem — when the title hasn't changed since the last Stop, the hook computes the new content, sees it's byte-identical to the existing file, and skips the write entirely.

Note: very short sessions may not produce an `ai-title` entry at all. In that case the hook exits silently (use `BONFIRE_DEBUG=1` to confirm). The hook will populate once Claude generates a title — typically after a handful of exchanges.

## Enable per repo

The adapter is **opt-in per repository**. Configuring the Stop hook globally never causes `.bonfire/` to materialize in random projects you happen to open Claude in. To enable bonfire in a repo:

```bash
cd <your-repo>
mkdir .bonfire
```

That's it. The next time Claude Code's `Stop` event fires (i.e. after an assistant turn ends) in that repo, the adapter will bootstrap `.bonfire/index.md` and start maintaining the fences. Disable by `rm -rf .bonfire/`.

## Install

No package install. Just point Claude Code at the script via your settings file.

**Global** (applies everywhere): add to `~/.claude/settings.json`:

```json
{
  "hooks": {
    "Stop": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": "node /Users/vieko/dev/bonfire/claude/update-bonfire.mjs"
          }
        ]
      }
    ]
  }
}
```

**Per-project** (only this repo): same block in `<project>/.claude/settings.local.json` instead.

If you already have a `hooks.Stop` block configured, append a new entry inside the existing `hooks` array — don't overwrite.

## Verify

```bash
# In a fresh sandbox git repo, after `claude` session and one assistant turn:
ls -la .bonfire/
cat .bonfire/index.md
```

Expect `.bonfire/index.md` bootstrapped with both fence blocks populated.

## Per-repo opt-out

Same as Pi adapter:

```json
// <git-root>/.bonfire/config.json
{ "auto": false }
```

## Debugging

The hook is silent by default — it exits 0 on every condition (missing git root, missing `.bonfire/`, missing Claude session entry, etc.) so it never blocks Claude Code's flow. If you've opted in (`mkdir .bonfire`) and nothing's appearing, enable diagnostic stderr:

```bash
# Per-session (won't persist)
BONFIRE_DEBUG=1 claude
```

Or edit the hook command in your settings:

```json
{ "type": "command", "command": "BONFIRE_DEBUG=1 node /Users/vieko/dev/bonfire/claude/update-bonfire.mjs" }
```

Messages go to stderr in the form `bonfire: <reason>` — you'll see them in Claude Code's hook output area.

## What doesn't trigger it

- Non-git directories: skipped silently.
- Sessions whose summary in `sessions-index.json` is empty or hasn't changed: hook computes new content, sees it matches existing file, no write.
- Files lacking the bonfire fence markers: hook never injects them. Bootstrap only happens when `.bonfire/index.md` is missing entirely.

## Why no install script

By design. The script never writes to your `~/.claude/settings.json` itself. You paste the block above into the right file with your editor of choice and you can see exactly what changed. Removing the adapter is the inverse — delete the block.

## License

MIT
