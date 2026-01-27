# Configure Settings

## Outcome

Project settings are updated to user's preferences.

## Acceptance Criteria

- `config.json` reflects user's choices
- `.gitignore` matches chosen git strategy
- Directory structure matches chosen locations

## Constraints

- Support targeted config: `config git`, `config linear` for quick changes
- Support full config: `config` with no args for all settings
- Preserve existing settings when doing targeted changes
- Warn if switching git strategy affects tracked files
- Create `.bonfire/` with defaults if it doesn't exist

## Settings

| Setting | Options |
|---------|---------|
| specsLocation | `.bonfire/specs/` or `specs/` |
| docsLocation | `.bonfire/docs/` or `docs/` |
| gitStrategy | ignore-all, hybrid, commit-all |
| linearEnabled | true or false |
