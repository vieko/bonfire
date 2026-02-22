# End Session

## Outcome

Session work is captured in index.md, context is healthy.

## Acceptance Criteria

- `index.md` reflects what was accomplished this session
- Next priorities are documented
- Garbage is detected and cleanup is offered

## Constraints

- Synthesize session summary from git commits, files changed, and conversation context
- Update context based on git commits, files changed, conversation
- Nudge memory update: after capturing session work, reflect on whether stable project knowledge was learned — update auto-memory if there are clear learnings, skip silently if not
  - **What qualifies**: Architecture patterns, file conventions, debugging insights, tool quirks, dependency gotchas — anything true across sessions, not just this one
  - **What doesn't qualify**: Session-specific context (what you worked on, what's next), anything already in `.bonfire/index.md` or `CLAUDE.md`
  - **Compaction benefit**: Knowledge that graduates to auto-memory doesn't need to be repeated in index.md — keep index.md temporal (what happened, what's next), let memory hold the stable facts
- Detect stale references: broken links, orphaned specs, old closed PRs (assess without date filtering)
- Move completed work to "Recent Sessions" section with concise summary
- Commit changes only if `gitStrategy` is "hybrid" or "commit-all"
