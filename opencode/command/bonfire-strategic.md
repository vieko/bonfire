---
description: Create strategic documents (RFC, PRD, POC)
---

# Create Strategic Document

Create a strategic document of type **$1** for **$2**.

---

## Document Type Detection

Parse $ARGUMENTS:
- First word: document type (rfc, prd, poc)
- Remaining: topic/subject

Examples:
- `/bonfire-strategic rfc authentication` → RFC about authentication
- `/bonfire-strategic prd dark-mode` → PRD about dark mode feature
- `/bonfire-strategic poc acme-corp` → POC plan for Acme Corp

If type not recognized or missing, ask user to specify.

---

## Supported Types

| Type | Full Name | Use Case |
|------|-----------|----------|
| `rfc` | Request for Comments | Technical decisions, architecture proposals |
| `prd` | Product Requirements Document | Product specs, feature definitions |
| `poc` | Proof of Concept Plan | Customer evaluations, technical validations |

---

## Shared Flow

All document types follow the same research → interview → write pattern:

### Phase 1: Research (Subagent)

**Progress**: Tell the user "Researching codebase for context..."

Use the Task tool to invoke the **codebase-explorer** agent.

Research questions vary by type:

**RFC**: Prior art, architecture, constraints, stakeholders
**PRD**: Related features, user flows, data model, technical constraints
**POC**: Relevant features, integration points, configuration, limitations

**Wait for findings** before proceeding.

### Phase 2: Interview (Main Context)

**Progress**: Tell the user "Starting interview..."

Interview rounds vary by type:

**RFC** (3 rounds):
1. Problem definition
2. Proposed solutions
3. Logistics & scope

**PRD** (4 rounds):
1. Problem & opportunity
2. Target users
3. Requirements & metrics
4. Scope

**POC** (4 rounds):
1. Customer context
2. Goals & success criteria
3. Scope & timeline
4. Risks & responsibilities

Use the question tool with informed questions based on research.

### Phase 3: Write (Subagent)

**Progress**: Tell the user "Writing document..."

Use the Task tool to invoke the **writer** agent.

Provide:
- Document type
- Research findings
- Interview Q&A
- Output path
- Template structure (type-specific)

### Phase 4: Verify & Confirm

Verify required sections are present (4 key sections per type).

If incomplete, offer: proceed / retry / abort.

---

## Type-Specific Details

### RFC (Request for Comments)

**Interview rounds**:
- Round 1: Problem definition (what problems, who experiences, evidence)
- Round 2: Proposed solutions (approach, alternatives, tradeoffs)
- Round 3: Logistics (reviewers, scope, timeline)

**Required sections**:
- `## Abstract`
- `## Problems We Need To Solve`
- `## Proposed Solution`
- `## Alternatives Considered`

**Naming**: `rfc-<topic>.md` or `rfc-<issue-id>-<topic>.md`

---

### PRD (Product Requirements Document)

**Interview rounds**:
- Round 1: Problem & opportunity (pain points, why now, business case)
- Round 2: Target users (primary/secondary audiences, plan gating)
- Round 3: Requirements & metrics (must-haves, success metrics)
- Round 4: Scope (in/out of scope, dependencies)

**Required sections**:
- `## 2. Problem`
- `## 5. Goals & Success Metrics`
- `## 6. Product Requirements`
- `## 9. Scope`

**Naming**: `prd-<feature>.md` or `prd-<issue-id>-<feature>.md`

---

### POC (Proof of Concept Plan)

**Interview rounds**:
- Round 1: Customer context (who, current state, why evaluating)
- Round 2: Goals & success criteria (what to prove, measurable outcomes)
- Round 3: Scope & timeline (in/out scope, dates, deadlines)
- Round 4: Risks & responsibilities (ownership, assumptions, risks)

**Required sections**:
- `## 2. Goals`
- `## 3. Success Criteria`
- `## 4. Scope`
- `## 5. Plan & Timeline`

**Naming**: `poc-<customer>.md` or `poc-<issue-id>-<customer>.md`

---

## File Locations

- **Config**: `<git-root>/.bonfire/config.json` contains `docsLocation`
- **Default**: `.bonfire/docs/` if not configured

---

## Post-Write

1. **Verify** document has required sections
2. **Link** to session context in `<git-root>/.bonfire/index.md`
3. **Confirm** with user and offer next steps
