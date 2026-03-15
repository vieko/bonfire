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
- Nudge memory update: if the agent supports persistent memory, reflect on whether stable project knowledge was learned this session — update it if there are clear learnings, skip silently if not
  - **What qualifies**: Architecture patterns, file conventions, debugging insights, tool quirks, dependency gotchas — anything true across sessions, not just this one
  - **What doesn't qualify**: Session-specific context (what you worked on, what's next), anything already in `.bonfire/index.md`
- Detect stale references: broken links, outdated sections (assess without date filtering)
- Move completed work to "Recent Sessions" section with concise summary
