---
description: Create documentation about a topic in the codebase
allowed-tools: Read, Write, Bash(git:*), Task
---

# Document Topic

Create reference documentation using subagent for research, preserving main context.

## Step 1: Find Git Root

Run `git rev-parse --show-toplevel` to locate the repository root.

## Step 2: Check Config

Read `<git-root>/.bonfire/config.json` if it exists.

**Docs location**: Read `docsLocation` from config. Default to `.bonfire/docs/` if not set.

## Step 3: Understand the Topic

The topic to document is: $ARGUMENTS

If no topic provided, ask the user what they want documented.

## Step 4: Explore the Codebase (Subagent)

**Progress**: Tell the user "Exploring codebase for [TOPIC]..."

Use the Task tool to invoke the **codebase-explorer** subagent for research.

Provide a research directive:

```
Research the codebase to document: [TOPIC]

Find:
1. **Architecture**: How this system/feature is structured, key components
2. **Key Files**: Important files and their roles
3. **Flow**: How data/control flows through the system
4. **Patterns**: Design patterns and conventions used
5. **Gotchas**: Important details, edge cases, things to watch out for

Return structured findings with file paths and brief descriptions.
```

**Wait for the subagent to return findings** before proceeding.

The subagent runs in isolated context (haiku model, fast), preserving main context for writing.

### Exploration Validation

After the subagent returns, validate the response:

**Valid response contains at least one of:**
- `## Architecture` or `## Patterns Found` with content
- `## Key Files` with entries
- `## Flow` or `## Gotchas` with items

**On valid response**: Proceed to Step 5.

**On invalid/empty response**:
1. Warn user: "Codebase exploration returned limited results. I'll research directly."
2. Fall back to in-context research:
   - `Glob("**/*[topic-related]*")` to find relevant files
   - `Grep("topic-keywords")` to find implementations
   - Read identified files
3. Continue to Step 5 with in-context findings.

**On subagent failure** (timeout, error):
1. Warn user: "Subagent exploration failed. Continuing with direct research."
2. Perform in-context research as above.
3. Continue to Step 5.

### Resumable Exploration (Large Codebases)

For very large codebases, exploration may need multiple passes. The Task tool returns an `agentId` you can use to resume.

**When to offer resume:**
- Subagent returns with "X additional items omitted" notes
- Findings cover only part of the topic (e.g., found architecture but not flows)
- User asks for deeper exploration of a specific aspect

**To resume exploration:**
1. Tell user: "Exploration found [X] but there's more to document. Continue exploring [specific aspect]?"
2. If yes, re-invoke codebase-explorer with the `resume` parameter:
   - Pass the agentId from the previous invocation
   - Provide a refined directive: "Continue exploring: [specific aspect]. Focus on [what to find]."
3. Merge findings from resumed exploration with previous findings.
4. Repeat if needed, up to 3 passes maximum.

**Example multi-pass scenario:**
- Pass 1: "Document payment system" → finds payment service, stripe integration
- Pass 2 (resume): "Continue exploring: refund handling" → finds refund logic, webhooks
- Merge: Combined findings produce more complete documentation

## Step 5: Write Documentation (Subagent)

**Progress**: Tell the user "Writing documentation..."

**Naming convention**: `<topic>.md` (kebab-case)

Examples:
- `inbound-agent-architecture.md`
- `sampling-strategies.md`
- `authentication-flow.md`

Use the Task tool to invoke the **doc-writer** subagent.

Provide the prompt in this exact format:

```
## Research Findings

<paste structured findings from Step 4>

## Doc Metadata

- **Topic**: <topic name>
- **Output Path**: <git-root>/<docsLocation>/<topic>.md
- **Date**: <YYYY-MM-DD>
```

The subagent will write the doc file directly to the Output Path.

### Doc Verification

After the doc-writer subagent returns, verify the doc is complete.

**Key sections to check** (lenient - only these 4):
- `## Overview`
- `## Key Files`
- `## How It Works`
- `## Gotchas`

**Verification steps:**

1. **Read the doc file** at `<git-root>/<docsLocation>/<topic>.md`

2. **If file missing or empty**:
   - Warn user: "Doc file wasn't written. Writing directly..."
   - Write the doc yourself using the Write tool
   - Run verification again on the written file

3. **If file exists, check for key sections**:
   - Scan content for the 4 section headers above
   - Track which sections are present/missing

4. **If all 4 sections present**:
   - Tell user: "Doc written and verified (4/4 key sections present)."
   - Proceed to Step 6.

5. **If 1-3 sections missing** (partial write):
   - Warn user: "Doc appears incomplete. Missing sections: [list missing]"
   - Show which sections ARE present
   - Ask: "Proceed with partial doc, retry write, or abort?"
   - **Proceed**: Continue to Step 6
   - **Retry**: Re-invoke doc-writer subagent with same input, then verify again
   - **Abort**: Stop and inform user the incomplete doc file remains at path

6. **If all sections missing but has content**:
   - Treat as invalid format, trigger fallback write
   - Write the doc yourself, then verify the written file

**On subagent failure** (timeout, error):
- Warn user: "Doc writer failed. Writing doc directly..."
- Write the doc yourself using the Write tool
- Run verification on the written file

## Formatting Tip

If the generated doc has inconsistent formatting, configure a PostToolUse hook to auto-format files after writes. See [PostToolUse Formatter Hook](../docs/post-tool-use-formatter-hook.md).

## Step 6: Link to Session Context

Add a reference to the doc in `<git-root>/.bonfire/index.md` under Key Resources or Notes.

## Step 7: Confirm

Summarize what was documented and ask if the user wants:
- More detail on any section
- Related topics documented
- To proceed with other work
