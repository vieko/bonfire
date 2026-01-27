# End Session

## Outcome

Session work is captured, context is healthy, completed work is archived.

## Acceptance Criteria

- `index.md` reflects what was accomplished this session
- Next priorities are documented and synced to tasks
- Garbage is detected and cleanup is offered
- Completed work is archived (PRs merged, tasks done)

## Constraints

- Update context based on git commits, files changed, conversation
- Detect stale references: broken links, orphaned specs >7 days, closed PRs >30 days
- Auto-archive if clear completion signals (all PRs merged, user said "done/shipped")
- Prompt before archiving if mixed state
- Skip archive if work is explicitly ongoing
- Archive naming: `YYYY-MM-DD-<topic>.md` (e.g., `2026-01-26-auth-refactor.md`)
- Commit changes only if `gitStrategy` is "hybrid" or "commit-all"
