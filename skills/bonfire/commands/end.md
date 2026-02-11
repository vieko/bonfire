# End Session

## Outcome

Session work is captured in index.md, context is healthy.

## Acceptance Criteria

- `index.md` reflects what was accomplished this session
- Next priorities are documented
- Garbage is detected and cleanup is offered

## Constraints

- Read current session summary from `~/.claude/projects` if available (same patterns as start.md)
  - **Directory naming**: Replace `/` with `-` in absolute project path (e.g., `/Users/vieko/dev/bonfire` → `-Users-vieko-dev-bonfire`)
  - **Index location**: `~/.claude/projects/<project-dir>/sessions-index.json`
  - **Structure**: `{ "version": 1, "entries": [...] }` where each entry contains:
    - `gitBranch` (string): git branch name
    - `modified` (string): ISO 8601 timestamp of last modification
    - `summary` (string): AI-generated session summary
    - `messageCount` (number): number of messages in session
    - `created` (string): ISO 8601 timestamp of session creation
    - `sessionId` (string): UUID
    - `firstPrompt` (string): First user message
    - `prNumber`, `prUrl` (optional): Associated PR if available
  - **Session matching**: Find entry with most recent `modified` timestamp on current branch
  - **Baseline extraction**: Get `summary`, `messageCount`, `firstPrompt` (truncate if >100 chars)
  - **Enrichment**: Combine baseline with git commits since session start, PRs (via `gh` if available), Linear issues (if `linear: true`), file changes
  - **Session note format**: Use summary as title, add decision paragraph with enriched context, bullet points for commits/PRs/file changes, session metadata line
  - **Graceful fallback**: Use manual synthesis (git commits + conversation) if sessions-index.json not found or no matching session
  - **Avoid**: Don't use jq date parsing (v4.3.1 lesson), validate timestamps with bash instead
- Update context based on git commits, files changed, conversation
- Nudge memory update: after capturing session work, reflect on whether stable project knowledge was learned
  - **What qualifies**: Architecture patterns, file conventions, debugging insights, tool quirks, dependency gotchas — anything true across sessions, not just this one
  - **What doesn't qualify**: Session-specific context (what you worked on, what's next), anything already in `.bonfire/index.md` or `CLAUDE.md`
  - **Where**: `~/.claude/projects/<project-dir>/memory/MEMORY.md` (auto-loaded by Claude on session start)
  - **How**: Update the memory file directly if there are clear learnings; skip silently if the session produced no durable knowledge
  - **Compaction benefit**: Knowledge that graduates to MEMORY.md doesn't need to be repeated in index.md — keep index.md temporal (what happened, what's next), let memory hold the stable facts
  - **Graceful degradation**: Skip if memory directory doesn't exist or path can't be resolved
- Detect stale references: broken links, orphaned specs, old closed PRs (assess without date filtering)
- Move completed work to "Recent Sessions" section with concise summary
- Commit changes only if `gitStrategy` is "hybrid" or "commit-all"
