# Configure Settings

## Outcome

Project settings are updated to user's preferences.

## Acceptance Criteria

- `index.md` frontmatter reflects user's choices
- `.gitignore` matches chosen git strategy
- Directory structure matches chosen locations

## Constraints

- Edit YAML frontmatter in `index.md` (not separate config.json)
- Support targeted config: `config git`, `config issues` for quick changes
- Support full config: `config` with no args for all settings
- Preserve existing frontmatter values when doing targeted changes
- Warn if switching git strategy affects tracked files
- Create `.bonfire/` with defaults if it doesn't exist

## Settings

Frontmatter format:
```yaml
---
specs: .bonfire/specs/
docs: .bonfire/docs/
git: ignore-all
issues: false
---
```

| Setting | Options |
|---------|---------|
| specs | `.bonfire/specs/` or `specs/` |
| docs | `.bonfire/docs/` or `docs/` |
| git | ignore-all, hybrid, commit-all |
| issues | true or false — enable issue tracking |
