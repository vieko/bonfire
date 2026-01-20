---
description: Create a Request for Comments (RFC) document
---

# Create RFC

A hybrid approach using subagents: research in isolated context, interview in main context, write in isolated context.

## Step 1: Find Git Root

Run `git rev-parse --show-toplevel` to locate the repository root.

## Step 2: Check Config

Read `<git-root>/.bonfire/config.json` if it exists.

**Docs location**: Read `docsLocation` from config. Default to `.bonfire/docs/` if not set.

## Step 3: Gather Initial Context

Get the topic from $ARGUMENTS or ask if unclear.

Check for existing context:
- Read `<git-root>/.bonfire/index.md` for project state
- Check for existing RFCs in docs location
- If issue ID provided, note for filename

## Step 4: Research Phase (Subagent)

**Progress**: Tell the user "Researching codebase for context and prior art..."

Use the task tool to invoke the **codebase-explorer** subagent for research.

Provide a research directive with these questions:

```
Research the codebase for RFC context: [TOPIC]

Find:
1. **Prior Art**: Existing implementations, related features, previous approaches
2. **Architecture**: Current system design, relevant components, integration points
3. **Constraints**: Technical limitations, dependencies, performance considerations
4. **Stakeholders**: Teams/systems that would be affected by changes

Return structured findings only - no raw file contents.
```

**Wait for the subagent to return findings** before proceeding.

### Research Validation

After the subagent returns, validate the response:

**Valid response contains at least one of:**
- `## Prior Art` or `## Patterns Found` with content
- `## Key Files` with entries
- `## Architecture` or `## Constraints` with items

**On valid response**: Proceed to Step 5.

**On invalid/empty response**:
1. Warn user: "Codebase exploration returned limited results. I'll research directly."
2. Fall back to in-context research using glob, grep, and read.
3. Continue to Step 5 with in-context findings.

## Step 5: Interview Phase (Main Context)

**Progress**: Tell the user "Starting interview (3 rounds: problem, solutions, logistics)..."

Using the research findings, interview the user with **informed questions** via the question tool.

### Round 1: Problem Definition

**Progress**: "Round 1/3: Problem definition..."

Ask about the problems being solved:

Example questions (adapt based on findings):
- "What specific problems does this RFC address? I found [existing approach] - what's not working?"
- "Who experiences these problems? End users, developers, ops?"
- "How do we know these are real problems? (metrics, incidents, feedback)"
- "I see [related system]. Is this problem isolated or connected to that?"

### Round 2: Proposed Solutions

**Progress**: "Round 2/3: Proposed solutions..."

Based on Round 1 answers and research, ask about solutions:

Example questions:
- "What's your primary proposed solution?"
- "I found [existing pattern]. Should the solution extend this or take a different approach?"
- "What alternatives did you consider? Why not [alternative approach]?"
- "What are the main tradeoffs of your proposed solution?"

### Round 3: Logistics & Scope (Required)

**Progress**: "Round 3/3: Logistics and scope (final round)..."

Always ask about logistics:

**Reviewers** (must ask):
- "Who should review this RFC? Which teams need to sign off?"

**Scope** (must ask):
- "What's explicitly out of scope for this RFC?"

**Timeline** (optional):
- "Any timeline constraints or dependencies?"

## Step 6: Write the RFC (Subagent)

**Progress**: Tell the user "Writing RFC document..."

Use the task tool to invoke the **doc-writer** subagent.

Provide the prompt in this exact format:

```
## Document Type

RFC (Request for Comments)

## Research Findings

<paste structured findings from Step 4>

## Interview Q&A

### Problem Definition
**Q**: <question from Round 1>
**A**: <user's answer>

### Proposed Solutions
**Q**: <question from Round 2>
**A**: <user's answer>

### Logistics & Scope
**Q**: <question from Round 3>
**A**: <user's answer>

## Document Metadata

- **Topic**: <topic name>
- **Author**: <from git config or ask>
- **Issue**: <issue ID or N/A>
- **Output Path**: <git-root>/<docsLocation>/rfc-<topic>.md
- **Date**: <YYYY-MM-DD>

## Template

Use this structure:

# RFC: <Title>

**Author(s):** <name>
**Reviewers:** <names/teams from interview>
**Status:** Draft
**Date:** <YYYY-MM-DD>

## Abstract

<!-- 1-3 sentences summarizing proposal and why -->

## Background

<!-- Context, history, prior work, relevant links -->

## Problems We Need To Solve

<!-- Bullet out concrete problems with evidence -->

- Problem 1...
- Problem 2...

## Proposed Solution

### Overview

### Architecture / Implementation

### Pros

- ...

### Cons / Tradeoffs

- ...

## Alternatives Considered

### Alternative A

- Summary
- Pros
- Cons

## Open Questions

<!-- Unresolved items needing feedback -->

- Question 1...

## Appendix

<!-- Links to issues, docs, prior RFCs -->
```

The subagent will write the RFC file directly to the Output Path.

**Naming convention**: `rfc-<topic>.md` or `rfc-<issue-id>-<topic>.md`

### Document Verification

After the doc-writer subagent returns, verify the RFC is complete.

**Key sections to check** (lenient - only these 4):
- `## Abstract`
- `## Problems We Need To Solve`
- `## Proposed Solution`
- `## Alternatives Considered`

**Verification steps:**

1. **Read the RFC file** at the output path

2. **If file missing or empty**:
   - Warn user: "RFC file wasn't written. Writing directly..."
   - Write the RFC yourself using the write tool

3. **If file exists, check for key sections**:
   - Scan content for the 4 section headers above
   - Track which sections are present/missing

4. **If all 4 sections present**:
   - Tell user: "RFC written and verified (4/4 key sections present)."
   - Proceed to Step 7.

5. **If sections missing**:
   - Warn user: "RFC appears incomplete. Missing sections: [list]"
   - Ask: "Proceed with partial RFC, retry write, or abort?"

## Step 7: Link to Session Context

Add a reference to the RFC in `<git-root>/.bonfire/index.md` under Current State.

## Step 8: Confirm

Read the generated RFC and present a summary. Ask if user wants to:
- Share with reviewers
- Refine specific sections
- Add more alternatives
- Save for later

## RFC Lifecycle

RFCs progress through states:

1. **Draft** - Initial creation, gathering feedback
2. **In Review** - Shared with reviewers, collecting comments
3. **Approved** - Accepted, ready for implementation
4. **Rejected** - Not moving forward (document why)

**When an RFC is approved**:
- Create implementation specs from it
- Link RFC in related issues/PRs
- Keep RFC as historical record
