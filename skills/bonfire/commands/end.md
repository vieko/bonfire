# End Session

## Outcome

The next session can resume from the index alone — every line earns its keep.

## Acceptance Criteria

- The index reflects in-flight state: open work, blockers, what to pick up next
- Cross-session learnings are routed to memory (if the agent supports it)
- Stale content is removed; garbage is acted on or stops being tracked

## Constraints

- Capture what changed and what was decided this session
- Nudge memory update: if the agent supports persistent memory, reflect on whether stable knowledge was learned this session — update if there are clear learnings, skip silently if not
  - **What qualifies**: Architecture patterns, file conventions, debugging insights, tool quirks, dependency gotchas — anything true across sessions
  - **What doesn't qualify**: Session-specific context, anything already in the index
- Keep the index in-flight only. Cross-session knowledge goes to memory; session state stays here.
- Don't mirror canonical sources. Issue trackers, git log, and deployment dashboards are authoritative — reference them, don't copy.
- Don't accumulate per-session prose. The most recent session's narrative is enough; older sessions collapse to a one-liner.
- Garbage gets acted on or stops being listed. A "garbage detected" entry that survives 3+ sessions is itself the garbage.
