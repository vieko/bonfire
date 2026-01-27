# Review Work

## Outcome

Blindspots and gaps are identified, actionable improvements are offered.

## Acceptance Criteria

Findings are categorized by action:
- **Fix Now**: Trivial effort, fix immediately
- **Needs Spec**: Important, requires planning
- **Create Issues**: Large effort or nice-to-have

## Constraints

- Gather context: branch diff, session notes, relevant specs
- Run analysis in isolated context (use general-purpose agent)
- Fall back to direct review if subagent fails
- Present findings with severity and effort estimates
- Execute chosen action: fix directly, create spec, or create issues
- Support GitHub issues always, Linear if enabled
- Update `index.md` with review outcomes

## Scope Options

- No args: Review current branch vs main
- `--session`: Review work in current session context
- Topic: Focus on specific area
