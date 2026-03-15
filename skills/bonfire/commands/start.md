# Start Session

## Outcome

Session is started, context is loaded, user knows what to work on.

## Acceptance Criteria

- `.bonfire/` directory exists with valid structure
- `index.md` exists with session context
- Context is read and summarized to user
- Recent sessions on current branch are noted (if any)
- User is asked what to work on this session

## Constraints

- Scaffold new projects using [templates/](../templates/) with sensible defaults
- If frontmatter exists with legacy keys (`linear`, `issues`, `specs`, `docs`), remove them — keep only `git` if not `ignore-all`
- Warn if context exceeds 20K tokens (suggest cleanup)
- Do not proactively access external services or URLs
