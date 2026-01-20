---
description: Create a Product Requirements Document (PRD)
allowed-tools: Read, Write, Bash(git:*), AskUserQuestion, Task
---

# Create PRD

A hybrid approach using subagents: research in isolated context, interview in main context, write in isolated context.

## Step 1: Find Git Root

Run `git rev-parse --show-toplevel` to locate the repository root.

## Step 2: Check Config

Read `<git-root>/.bonfire/config.json` if it exists.

**Docs location**: Read `docsLocation` from config. Default to `.bonfire/docs/` if not set.

## Step 3: Gather Initial Context

Get the feature/product name from $ARGUMENTS or ask if unclear.

Check for existing context:
- Read `<git-root>/.bonfire/index.md` for project state
- Check for existing PRDs in docs location
- If issue ID provided, note for filename

## Step 4: Research Phase (Subagent)

**Progress**: Tell the user "Researching codebase for product context..."

Use the Task tool to invoke the **codebase-explorer** subagent for research.

Provide a research directive with these questions:

```
Research the codebase for PRD context: [FEATURE/PRODUCT]

Find:
1. **Related Features**: Existing similar features, integration points, shared components
2. **User Flows**: Current user journeys, entry points, related screens/endpoints
3. **Data Model**: Relevant entities, schemas, APIs that would be affected
4. **Technical Constraints**: Performance limits, plan gating, existing quotas/limits

Return structured findings only - no raw file contents.
```

**Wait for the subagent to return findings** before proceeding.

### Research Validation

After the subagent returns, validate the response:

**Valid response contains at least one of:**
- `## Related Features` or `## Patterns Found` with content
- `## Key Files` with entries
- `## User Flows` or `## Data Model` with items

**On valid response**: Proceed to Step 5.

**On invalid/empty response**:
1. Warn user: "Codebase exploration returned limited results. I'll research directly."
2. Fall back to in-context research using Glob, Grep, and Read.
3. Continue to Step 5 with in-context findings.

## Step 5: Interview Phase (Main Context)

**Progress**: Tell the user "Starting interview (4 rounds: problem, users, requirements, scope)..."

Using the research findings, interview the user with **informed questions** via AskUserQuestion.

### Round 1: Problem & Opportunity

**Progress**: "Round 1/4: Problem and opportunity..."

Ask about the problem and why now:

Example questions (adapt based on findings):
- "What problem does this feature solve? Who feels this pain most?"
- "Why build this now vs later? (market, competition, customer requests)"
- "I found [existing feature]. How does this relate or differ?"
- "What's the business opportunity? Revenue, retention, expansion?"

### Round 2: Target Users

**Progress**: "Round 2/4: Target users..."

Based on Round 1 answers and research, ask about users:

Example questions:
- "Who is the primary audience? (persona, plan tier, role)"
- "Secondary audiences?"
- "I see [existing user flow]. Will these same users use this feature?"
- "Any users who should NOT have access? (plan gating, permissions)"

### Round 3: Requirements & Metrics

**Progress**: "Round 3/4: Requirements and success metrics..."

Ask about what success looks like:

**Functional requirements** (must ask):
- "What must this feature do? (the 'must haves')"
- "What should it do? (the 'should haves')"

**Success metrics** (must ask):
- "How will we measure success? (adoption, retention, revenue, NPS)"
- "What are the guardrail metrics? (performance, reliability, support load)"

### Round 4: Scope (Required)

**Progress**: "Round 4/4: Scope (final round)..."

Always ask about scope:

**In scope** (must ask):
- "What's explicitly in scope for v1?"

**Out of scope** (must ask):
- "What's explicitly out of scope or deferred to later?"

**Dependencies**:
- "Any dependencies on other teams, projects, or launches?"

## Step 6: Write the PRD (Subagent)

**Progress**: Tell the user "Writing PRD document..."

Use the Task tool to invoke the **doc-writer** subagent.

Provide the prompt in this exact format:

```
## Document Type

PRD (Product Requirements Document)

## Research Findings

<paste structured findings from Step 4>

## Interview Q&A

### Problem & Opportunity
**Q**: <question from Round 1>
**A**: <user's answer>

### Target Users
**Q**: <question from Round 2>
**A**: <user's answer>

### Requirements & Metrics
**Q**: <question from Round 3>
**A**: <user's answer>

### Scope
**Q**: <question from Round 4>
**A**: <user's answer>

## Document Metadata

- **Feature**: <feature name>
- **DRI (PM)**: <from interview or ask>
- **Issue**: <issue ID or N/A>
- **Output Path**: <git-root>/<docsLocation>/prd-<feature>.md
- **Date**: <YYYY-MM-DD>

## Template

Use this structure:

# PRD: <Feature Name>

**DRI (PM):** <name>
**Engineering DRI:** <name or TBD>
**Product Area:** <area/team>
**Last Updated:** <YYYY-MM-DD>

---

## 1. Overview

<!-- 3-5 sentence narrative: what, who, outcome -->

## 2. Problem

### Customer Pain Points

- ...

### Internal Pain Points

- ...

## 3. Opportunity / Why Now

<!-- Why this matters now -->

## 4. Target Audience

- **Primary:** ...
- **Secondary:** ...

## 5. Goals & Success Metrics

### Goals

- G1: ...
- G2: ...

### Metrics for Success

- Core metric(s): ...
- Guardrails: ...

## 6. Product Requirements

### 6.1 Functional Requirements

- FR1: ...
- FR2: ...

### 6.2 Non-functional Requirements

- NFR1: ...

## 7. User Stories

- As a <persona>, I want <goal> so that <outcome>.

## 8. Solution Outline

### 8.1 UX / Flows

<!-- High-level flows, link to designs -->

### 8.2 Product Details

- Plans: which plans get what
- Limits / quotas
- Interactions with existing features

## 9. Scope

### 9.1 In Scope

- ...

### 9.2 Out of Scope

- ...

## 10. Dependencies & Risks

### Dependencies

- ...

### Risks & Mitigations

- Risk: ...
  Mitigation: ...

## 11. Open Questions

- Q1...

## 12. Appendix

<!-- Links to designs, RFCs, customer notes -->
```

The subagent will write the PRD file directly to the Output Path.

**Naming convention**: `prd-<feature>.md` or `prd-<issue-id>-<feature>.md`

### Document Verification

After the doc-writer subagent returns, verify the PRD is complete.

**Key sections to check** (lenient - only these 4):
- `## 2. Problem`
- `## 5. Goals & Success Metrics`
- `## 6. Product Requirements`
- `## 9. Scope`

**Verification steps:**

1. **Read the PRD file** at the output path

2. **If file missing or empty**:
   - Warn user: "PRD file wasn't written. Writing directly..."
   - Write the PRD yourself using the Write tool

3. **If file exists, check for key sections**:
   - Scan content for the 4 section headers above
   - Track which sections are present/missing

4. **If all 4 sections present**:
   - Tell user: "PRD written and verified (4/4 key sections present)."
   - Proceed to Step 7.

5. **If sections missing**:
   - Warn user: "PRD appears incomplete. Missing sections: [list]"
   - Ask: "Proceed with partial PRD, retry write, or abort?"

## Step 7: Link to Session Context

Add a reference to the PRD in `<git-root>/.bonfire/index.md` under Current State.

## Step 8: Confirm

Read the generated PRD and present a summary. Ask if user wants to:
- Share with stakeholders
- Refine specific sections
- Add more requirements
- Create implementation specs from this

## PRD Lifecycle

PRDs progress through states:

1. **Draft** - Initial creation, gathering input
2. **In Review** - Shared with stakeholders
3. **Approved** - Signed off, ready for engineering
4. **In Development** - Being built
5. **Shipped** - Feature launched

**When a PRD is approved**:
- Create RFCs for technical decisions
- Create implementation specs for engineering
- Link PRD in related issues/PRs
