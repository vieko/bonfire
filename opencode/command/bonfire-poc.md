---
description: Create a Proof of Concept (POC) plan
---

# Create POC Plan

A hybrid approach using subagents: research in isolated context, interview in main context, write in isolated context.

## Step 1: Find Git Root

Run `git rev-parse --show-toplevel` to locate the repository root.

## Step 2: Check Config

Read `<git-root>/.bonfire/config.json` if it exists.

**Docs location**: Read `docsLocation` from config. Default to `.bonfire/docs/` if not set.

## Step 3: Gather Initial Context

Get the customer/project name from $ARGUMENTS or ask if unclear.

Check for existing context:
- Read `<git-root>/.bonfire/index.md` for project state
- Check for existing POC plans in docs location
- If issue ID provided, note for filename

## Step 4: Research Phase (Subagent)

**Progress**: Tell the user "Researching codebase for POC context..."

Use the task tool to invoke the **codebase-explorer** subagent for research.

Provide a research directive with these questions:

```
Research the codebase for POC context: [CUSTOMER/PROJECT]

Find:
1. **Relevant Features**: Features/products being evaluated in this POC
2. **Integration Points**: APIs, webhooks, SDKs that customer would use
3. **Configuration**: Environment setup, feature flags, plan requirements
4. **Limitations**: Known constraints, quotas, edge cases to test

Return structured findings only - no raw file contents.
```

**Wait for the subagent to return findings** before proceeding.

### Research Validation

After the subagent returns, validate the response:

**Valid response contains at least one of:**
- `## Relevant Features` or `## Key Files` with content
- `## Integration Points` with entries
- `## Configuration` or `## Limitations` with items

**On valid response**: Proceed to Step 5.

**On invalid/empty response**:
1. Warn user: "Codebase exploration returned limited results. I'll research directly."
2. Fall back to in-context research using glob, grep, and read.
3. Continue to Step 5 with in-context findings.

**Note**: POCs may be less code-focused. If research returns minimal findings, that's okay - the interview will gather most context.

## Step 5: Interview Phase (Main Context)

**Progress**: Tell the user "Starting interview (4 rounds: context, goals, plan, logistics)..."

Using the research findings, interview the user with **informed questions** via the question tool.

### Round 1: Customer Context

**Progress**: "Round 1/4: Customer context..."

Ask about the customer and current state:

Example questions:
- "Who is the customer? Brief context on their business/use case."
- "What's their current state? (existing stack, competitor product, greenfield)"
- "Who are the DRIs on the customer side? (technical lead, decision maker)"
- "Why are they evaluating us? What triggered this POC?"

### Round 2: Goals & Success Criteria

**Progress**: "Round 2/4: Goals and success criteria..."

Based on Round 1 answers and research, ask about success:

Example questions:
- "What are the top 3 goals for this POC? What must we prove?"
- "What does success look like? (specific, measurable criteria)"
- "What would make this POC fail? (dealbreakers, must-haves)"
- "I found [feature/limitation]. Is this relevant to their evaluation?"

### Round 3: Scope & Timeline

**Progress**: "Round 3/4: Scope and timeline..."

Ask about what's included:

**Scope** (must ask):
- "What's in scope for this POC? (features, workloads, environments)"
- "What's explicitly out of scope?"

**Timeline** (must ask):
- "POC start date and target decision date?"
- "Any hard deadlines? (contract renewal, board meeting, etc.)"

### Round 4: Risks & Responsibilities (Required)

**Progress**: "Round 4/4: Risks and responsibilities (final round)..."

Always ask about logistics:

**Responsibilities** (must ask):
- "What will our team own vs what will the customer own?"
- "Who is the internal DRI for this POC?"

**Risks** (must ask):
- "What are the main risks? (technical, timeline, relationship)"
- "Any assumptions we're making that could be wrong?"

## Step 6: Write the POC Plan (Subagent)

**Progress**: Tell the user "Writing POC plan..."

Use the task tool to invoke the **doc-writer** subagent.

Provide the prompt in this exact format:

```
## Document Type

POC (Proof of Concept) Plan

## Research Findings

<paste structured findings from Step 4>

## Interview Q&A

### Customer Context
**Q**: <question from Round 1>
**A**: <user's answer>

### Goals & Success Criteria
**Q**: <question from Round 2>
**A**: <user's answer>

### Scope & Timeline
**Q**: <question from Round 3>
**A**: <user's answer>

### Risks & Responsibilities
**Q**: <question from Round 4>
**A**: <user's answer>

## Document Metadata

- **Customer**: <customer name>
- **Internal DRI**: <from interview>
- **Issue**: <issue ID or N/A>
- **Output Path**: <git-root>/<docsLocation>/poc-<customer>.md
- **Date**: <YYYY-MM-DD>

## Template

Use this structure:

# <Customer> - Proof of Concept (POC) Plan

**Customer / Partner:** <name>
**Internal DRIs:** <names & roles>
**Customer DRIs:** <names & roles>
**POC Start:** <date>
**Target Decision Date:** <date>

---

## 1. Context

<!-- Short summary: customer, current state, why this POC -->

## 2. Goals

<!-- 3-5 bullets: what we want to validate -->

- Goal 1...
- Goal 2...

## 3. Success Criteria

<!-- Concrete, measurable exit criteria -->

- Technical: ...
- Performance / reliability: ...
- DX / workflow: ...
- Commercial (optional): ...

## 4. Scope

### 4.1 In Scope

- Workloads / apps / surfaces included
- Products / features being evaluated
- Environments (staging, prod shadow, etc.)

### 4.2 Out of Scope

- What we will NOT do in this POC

## 5. Plan & Timeline

### Phase 1 - Prep

- Environment setup
- Access and security requirements
- Baseline metrics (before POC)

### Phase 2 - Implementation

- Tasks / owners (Internal vs Customer)
- Milestones

### Phase 3 - Validation

- Tests to run
- How we'll collect metrics and feedback

### Phase 4 - Review & Decision

- Joint review meeting
- Decision options: Go / No-go / Extend
- Next steps if "Go"

## 6. Responsibilities

### Internal Team

- ...

### Customer

- ...

## 7. Assumptions

<!-- Things we're assuming will be true -->

- ...

## 8. Risks & Mitigations

- Risk: ...
  Mitigation: ...

## 9. Reporting

<!-- How progress and results will be shared -->

- Weekly update: ...
- Final summary: ...

## 10. Appendix

<!-- Links to architecture, repos, dashboards, contracts -->
```

The subagent will write the POC plan directly to the Output Path.

**Naming convention**: `poc-<customer>.md` or `poc-<issue-id>-<customer>.md`

### Document Verification

After the doc-writer subagent returns, verify the POC plan is complete.

**Key sections to check** (lenient - only these 4):
- `## 2. Goals`
- `## 3. Success Criteria`
- `## 4. Scope`
- `## 5. Plan & Timeline`

**Verification steps:**

1. **Read the POC file** at the output path

2. **If file missing or empty**:
   - Warn user: "POC plan wasn't written. Writing directly..."
   - Write the POC plan yourself using the write tool

3. **If file exists, check for key sections**:
   - Scan content for the 4 section headers above
   - Track which sections are present/missing

4. **If all 4 sections present**:
   - Tell user: "POC plan written and verified (4/4 key sections present)."
   - Proceed to Step 7.

5. **If sections missing**:
   - Warn user: "POC plan appears incomplete. Missing sections: [list]"
   - Ask: "Proceed with partial plan, retry write, or abort?"

## Step 7: Link to Session Context

Add a reference to the POC plan in `<git-root>/.bonfire/index.md` under Current State.

## Step 8: Confirm

Read the generated POC plan and present a summary. Ask if user wants to:
- Share with customer
- Refine specific sections
- Add more detail to timeline
- Create related issues/tasks

## POC Lifecycle

POC plans progress through states:

1. **Draft** - Initial creation
2. **Prep** - Environment setup, access provisioned
3. **Active** - POC in progress
4. **Review** - Evaluating results
5. **Decided** - Go / No-go / Extend

**When a POC concludes**:
- Document outcome and learnings
- If "Go": Create onboarding plan, handoff docs
- If "No-go": Document reasons for future reference
- Archive the POC plan with outcome notes
