# PRD Template

## Interview Rounds

- **Round 1**: Problem & opportunity (pain points, why now, business case)
- **Round 2**: Target users (primary/secondary audiences, plan gating)
- **Round 3**: Requirements & metrics (must-haves, success metrics)
- **Round 4**: Scope (in/out of scope, dependencies)

## Required Sections

- `## 2. Problem`
- `## 5. Goals & Success Metrics`
- `## 6. Product Requirements`
- `## 9. Scope`

## Template Structure

```markdown
# PRD: <Feature Name>

**DRI (PM):** <name>
**Engineering DRI:** <name or TBD>
**Last Updated:** <YYYY-MM-DD>

## 1. Overview

[Brief summary of the feature]

## 2. Problem

[What problem are we solving? Who has this problem?]

## 3. Opportunity / Why Now

[Business case, market timing, strategic importance]

## 4. Target Audience

**Primary:** [Main user segment]
**Secondary:** [Other beneficiaries]

## 5. Goals & Success Metrics

| Goal | Metric | Target |
|------|--------|--------|
| [Goal 1] | [How measured] | [Target value] |

## 6. Product Requirements

### Must Have (P0)

- [ ] [Requirement 1]
- [ ] [Requirement 2]

### Should Have (P1)

- [ ] [Requirement 3]

### Nice to Have (P2)

- [ ] [Requirement 4]

## 7. User Stories

**As a** [user type], **I want** [action] **so that** [benefit].

## 8. Solution Outline

[High-level technical approach, not detailed design]

## 9. Scope

### In Scope

- [Item 1]
- [Item 2]

### Out of Scope

- [Item 3]
- [Item 4]

## 10. Dependencies & Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| [Risk 1] | High/Med/Low | High/Med/Low | [Strategy] |

## 11. Open Questions

- [ ] [Question 1]
- [ ] [Question 2]

## 12. Appendix

[Mockups, research, references]
```

## Naming Convention

`prd-<feature>.md` or `prd-<issue-id>-<feature>.md`

## Lifecycle

Draft → In Review → Approved → In Development → Shipped
