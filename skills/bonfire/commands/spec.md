# Create Outcome Spec

## Outcome

A complete outcome spec that defines what to build and how to verify it — the agent determines the procedure.

## Acceptance Criteria

Spec file contains:
- **Overview**: What to build and why
- **Decisions**: Key technical choices with rationale
- **Implementation Steps**: Concrete, ordered steps
- **Edge Cases**: Error handling, boundary conditions

## Constraints

- Sanitize topic for use as filename — strip path separators, special characters, and traversal patterns (`../`)
- Research codebase first (use Explore agent)
- Interview user for decisions, edge cases, testing approach, scope
- Assess scope: if the work has natural seams (independent components, sequential phases, separable concerns), recommend splitting into a parent spec with child specs
  - **Parent spec**: Overview of the full feature, links to child specs, execution order if sequential
  - **Child specs**: Each self-contained with its own Overview, Decisions, Steps, Edge Cases
  - **Naming**: `<topic>.md` for single specs, `<topic>/index.md` + `<topic>/01-<part>.md` for split specs
  - **User decides**: Present the split recommendation with rationale, user confirms or overrides
- Write spec in isolated context (use general-purpose agent)
- Verify all required sections exist before completing
- Save to configured `specsLocation`
- Reference actual codebase patterns, not generic advice
- Create issues for tracking if `issues: true` in frontmatter — skip if user declines
- Add reference to spec in `index.md`
- After saving spec files, register them in the forge manifest: `forge specs --add <spec-path>` (with `-C` if targeting a different repo). This ensures `forge specs` shows them as `pending` immediately.

## Quality Signals

- Decisions reference real code patterns
- Steps include actual file paths and function names
- Edge cases reflect discovered constraints
