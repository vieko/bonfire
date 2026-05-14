# Start Session

## Outcome

The user has the context they need to resume work.

## Acceptance Criteria

- `.bonfire/index.md` exists with session context (scaffold from [templates/](../templates/) if missing)
- Context is summarized to the user
- Claims the index makes about external state (open PRs, in-review tickets, ticket assignments) are verified against canonical sources before being trusted
- Queued handoffs under `~/.bonfire/handoffs/` are surfaced so the user can pick one to consume in a fresh session
- User is asked what to work on this session

## Constraints

- Don't trust prior-session prose blindly. The previous session's narrator can be wrong; bot reviews lapse; tickets get reassigned. Verify before acting.
- Don't proactively access external services except to verify claims the index makes
- If the index has grown past its useful shape (rambling prose, mirrored content, stale sections), surface that and offer to trim
