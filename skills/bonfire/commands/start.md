# Start Session

## Outcome

Session is started, context is loaded, user knows what to work on.

## Acceptance Criteria

- `.bonfire/` directory exists with valid structure
- `index.md` exists with config and session context
- Context is read and summarized to user
- Recent Claude sessions on current branch are noted (if any)
- User is asked what to work on this session

## Constraints

- Scaffold new projects using [templates/](../templates/) with sensible defaults
- If frontmatter contains `linear` key, rename it to `issues` (v5.0.0 migration)
- Ask user for preferences on first run (specs location, docs location, git strategy, issue tracking)
- Warn if context exceeds 20K tokens (suggest cleanup)
- Do not proactively access external services or URLs
