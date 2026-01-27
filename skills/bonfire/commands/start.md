# Start Session

## Outcome

Session is started, context is loaded, user knows what to work on.

## Acceptance Criteria

- `.bonfire/` directory exists with valid structure
- `config.json` exists with project settings
- `index.md` is read and summarized to user
- User is asked what to work on this session

## Constraints

- Scaffold new projects using [templates/](../templates/) with sensible defaults
- Ask user for preferences on first run (specs location, docs location, git strategy, Linear)
- Warn if context exceeds 20K tokens (suggest archiving)
- Check for existing tasks and surface them
- Fetch external context (GitHub/Linear) only if user provides URL or issue ID
