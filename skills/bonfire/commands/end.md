---
disable-model-invocation: true
---

# End Session (fallback)

## Outcome

`<git-root>/.bonfire/index.md` reflects the current session's work inside its two managed fence blocks — no native adapter required.

## Acceptance Criteria

1. **Opt-in respected**: `<git-root>/.bonfire/` exists. If not, exit silently without creating anything.
2. **Per-repo opt-out respected**: if `<git-root>/.bonfire/config.json` exists and has `{ "auto": false }`, exit silently.
3. **File bootstrapped if missing**: if `<git-root>/.bonfire/index.md` doesn't exist, create it from [templates/index.md](../templates/index.md) (which includes both fence markers).
4. **In-flight fence updated** between `<!-- bonfire:auto-inflight:start v1 -->` and `<!-- bonfire:auto-inflight:end -->`:
   - First line inside the fence: `_Updated YYYY-MM-DD from <host>:<short-session-id> on \`<branch>\`_`
   - Then `## In flight` heading
   - Then `### Goal` with a one-line session headline
   - If you have structured context (e.g., "what's done", "what's blocked"), add `### In Progress`, `### Blocked`, `### Next Steps` subsections
   - Otherwise add `### Modified files` with output of `git diff --name-only HEAD` (up to 10 entries)
5. **Sessions fence updated** between `<!-- bonfire:auto-sessions:start v1 -->` and `<!-- bonfire:auto-sessions:end -->`:
   - One row per session, format: `- YYYY-MM-DD [<host>:<short-session-id>] <branch> — <one-line headline>`
   - Insert the new row at the top (newest first)
   - De-dupe by `[<host>:<short-session-id>]` — same session updates its existing row instead of duplicating
   - Cap at 5 newest rows; drop the rest
6. **Atomic write**: write to a tmpfile and rename. Don't truncate-in-place.

## Constraints

- **Never modify content outside the fence markers.** Everything outside is user-curated.
- **Never inject fence markers** into a file that doesn't have them. If `index.md` exists but lacks fences, exit without writing — user has chosen a different layout.
- **Short session id**: use ≥8 random hex chars from the session's UUID (skip the first 8 chars if it's UUIDv7, since those encode the timestamp and collide for time-clustered sessions). If your agent has no native session id, derive a stable one from a conversation hash and document its scope.
- **Host token**: use a short identifier for your agent (`pi`, `claude`, `codex`, `opencode`, etc.) so multi-agent users can tell rows apart.
- **Garbage detection**: if the existing in-flight or sessions row matches `/no conversation (content|messages?)/i`, treat it as missing (upstream bug pattern) and overwrite with current session data.
- **Stale detection**: if the in-flight's `_Updated from <host>:<id>_` line references a different session id than yours, overwrite with current session data. The in-flight should always reflect the most recent session.

## When the adapter is a better choice

| Host | Adapter location |
|------|------------------|
| Pi | `~/dev/bonfire/pi/` — hooks `session_compact` (rich structured summary) + `session_shutdown` (first-prompt fallback). Zero ritual. |
| Claude Code | `~/dev/bonfire/claude/` — Stop hook reading `ai-title` from the session JSONL. Zero ritual. |

Install the adapter for your host once and you never need to run `/skill:bonfire end` again.
