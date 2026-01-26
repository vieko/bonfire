---
name: bonfire-strategic
description: Create strategic documents (RFC, PRD, POC)
license: MIT
argument-hint: <rfc|prd|poc> <topic>
allowed-tools: Read, Write, Bash(git:*), AskUserQuestion, Task
metadata:
  author: vieko
  version: "3.0.0"
---

# Create Strategic Document

Create a strategic document of type **$1** for **$2**.

Git root: !`git rev-parse --show-toplevel`

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

| Type | Full Name | Use Case | Template |
|------|-----------|----------|----------|
| `rfc` | Request for Comments | Technical decisions, architecture proposals | [references/rfc-template.md](references/rfc-template.md) |
| `prd` | Product Requirements Document | Product specs, feature definitions | [references/prd-template.md](references/prd-template.md) |
| `poc` | Proof of Concept Plan | Customer evaluations, technical validations | [references/poc-template.md](references/poc-template.md) |

---

## Workflow

All document types follow the same research → interview → write pattern:

### Phase 1: Research (Subagent)

**Progress**: Tell the user "Researching codebase for context..."

Use the Task tool to invoke the **Explore** agent.

Research questions vary by type:

- **RFC**: Prior art, architecture, constraints, stakeholders
- **PRD**: Related features, user flows, data model, technical constraints
- **POC**: Relevant features, integration points, configuration, limitations

**Wait for findings** before proceeding.

### Phase 2: Interview (Main Context)

**Progress**: Tell the user "Starting interview..."

Read the appropriate template from `references/` to get interview rounds.

Use AskUserQuestion with informed questions based on research.

### Phase 3: Write (Subagent)

**Progress**: Tell the user "Writing document..."

Use the Task tool to invoke the **general-purpose** agent.

Provide:
- Document type
- Research findings
- Interview Q&A
- Output path
- Template structure from `references/`

### Phase 4: Verify & Confirm

Read the template to get required sections, then verify they are present.

If incomplete, offer: proceed / retry / abort.

---

## File Locations

- **Config**: `<git-root>/.bonfire/config.json` contains `docsLocation`
- **Default**: `.bonfire/docs/` if not configured

---

## Post-Write

1. **Verify** document has required sections (from template)
2. **Link** to session context in `<git-root>/.bonfire/index.md`
3. **Confirm** with user and offer next steps:
   - Share with reviewers/stakeholders
   - Refine specific sections
   - Create implementation specs (from RFC/PRD)
   - Create related issues

---

## Document Lifecycle

All strategic docs progress through states (see templates for details):

- **RFC**: Draft → In Review → Approved → Rejected
- **PRD**: Draft → In Review → Approved → In Development → Shipped
- **POC**: Draft → Prep → Active → Review → Decided (Go/No-go/Extend)

When approved/decided:
- Create follow-up artifacts (specs, issues, plans)
- Archive with outcome notes
