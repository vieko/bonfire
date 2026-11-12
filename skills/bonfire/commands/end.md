---
disable-model-invocation: true
---

# End Session (fallback)

## Outcome

`<git-root>/.bonfire/index.md` reflects the current session's work inside its two managed fence blocks — no native adapter required.

## Acceptance Criteria

1. **Opt-in respected**: `<git-root>/.bonfire/` exists. If not, write nothing locally and create nothing; in a linked worktree, criterion 7 still applies.
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
7. **Main-worktree session row**: when running in a linked worktree, also upsert the byte-identical Sessions row into the main worktree's `.bonfire/index.md`, without changing its in-flight fence or any text outside the sessions fence. Find the main worktree with `git rev-parse --path-format=absolute --git-common-dir` (the parent directory), or the first entry of `git worktree list --porcelain`. Only do this when the main worktree has `.bonfire/` and its config does not set `"auto": false`; never create `.bonfire/`. If the session is in the main worktree, keep the existing behavior. A detached worktree adds no row to the main index; local behavior is unchanged.

## Constraints

- **Never modify content outside the fence markers.** Everything outside is user-curated.
- **Never inject fence markers** into a file that doesn't have them. If `index.md` exists but lacks fences, exit without writing — user has chosen a different layout.
- **Short session id**: use ≥8 random hex chars from the session's UUID (skip the first 8 chars if it's UUIDv7, since those encode the timestamp and collide for time-clustered sessions). If your agent has no native session id, derive a stable one from a conversation hash and document its scope.
- **Host token**: use a short identifier for your agent (`pi`, `claude`, `codex`, `opencode`, etc.) so multi-agent users can tell rows apart.
- **Garbage detection**: if the existing in-flight or sessions row matches `/no conversation (content|messages?)/i`, treat it as missing (upstream bug pattern) and overwrite with current session data.
- **Stale detection**: if the in-flight's `_Updated from <host>:<id>_` line references a different session id than yours, overwrite with current session data. The in-flight should always reflect the most recent session.

## Host recipes

### Pi (0.82.0+)

Pi injects session env vars into agent-run bash commands (`PI_SESSION_ID`, `PI_SESSION_FILE`; not available in user-entered `!` commands). When present, prefer them over deriving identity yourself:

- **Short session id** — byte-identical to the native adapter's `shortenSessionId()`, so a row you write de-dupes against adapter-written `[pi:<id>]` rows for the same session instead of duplicating:

  ```bash
  printf '%s' "$PI_SESSION_ID" | tr -d '-' | cut -c9-16
  ```

- **Session transcript** — `$PI_SESSION_FILE` is the absolute path to this session's JSONL (unset for ephemeral sessions; always guard). Use it to recover the first substantive user prompt or file activity when compaction has evicted them from your context:

  ```bash
  [ -n "$PI_SESSION_FILE" ] && jq -r 'select(.type == "message" and .message.role == "user") | .message.content | if type == "string" then . else (map(select(.type == "text") | .text) | join("\n")) end' "$PI_SESSION_FILE" | head -5
  ```

When the vars are unset (Pi < 0.82.0, or any other host), fall back to the generic short-id rule under Constraints.

## When the adapter is a better choice

| Host | Adapter location |
|------|------------------|
| Pi | `~/dev/bonfire/pi/` — hooks `session_compact` (rich structured summary) + `session_shutdown` (first-prompt fallback). Zero ritual. |
| Claude Code | `~/dev/bonfire/claude/` — Stop hook reading `ai-title` from the session JSONL. Zero ritual. |

Install the adapter for your host once and you never need to run `/skill:bonfire end` again.
