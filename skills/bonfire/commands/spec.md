# Create Implementation Spec

## Outcome

A complete implementation spec that enables building the feature.

## Acceptance Criteria

Spec file contains:
- **Overview**: What to build and why
- **Decisions**: Key technical choices with rationale
- **Implementation Steps**: Concrete, ordered steps
- **Edge Cases**: Error handling, boundary conditions

## Constraints

- Research codebase first (use Explore agent)
- Interview user for decisions, edge cases, testing approach, scope
- Write spec in isolated context (use general-purpose agent)
- Verify all required sections exist before completing
- Save to configured `specsLocation`
- Reference actual codebase patterns, not generic advice
- Add reference to spec in `index.md`

## Quality Signals

- Decisions reference real code patterns
- Steps include actual file paths and function names
- Edge cases reflect discovered constraints
