---
description: Create an implementation spec for a feature or task
allowed-tools: Read, Write, Glob, Grep, Bash(git:*)
---

# Create Implementation Spec

## Step 1: Find Git Root

Run `git rev-parse --show-toplevel` to locate the repository root.

## Step 2: Check Config

Read `<git-root>/.sessions/config.json` if it exists.

**Model preference**: If `models.spec` is set to something other than "inherit", use that model for this task:
- If "opus": Use deep architectural reasoning, be thorough
- If "sonnet": Balance depth with efficiency
- If "haiku": Be concise and fast

If "inherit" or not set, proceed with current conversation model.

**Specs location**: Read `specsLocation` from config. Default to `.sessions/specs/` if not set.

## Step 3: Understand the Task

Ask the user what they want to spec if not already clear from $ARGUMENTS.

If an issue ID is provided (JIRA, Linear, GitHub), note it for the filename.

## Step 4: Research

Launch a thorough exploration:
- Search the codebase for relevant patterns
- Understand existing architecture
- Identify files that will need changes
- Note any dependencies or constraints

## Step 5: Design the Spec

Create a structured implementation spec:

1. **Overview**: What we're building and why
2. **Approach**: High-level strategy
3. **Files to Modify**: Specific files and what changes each needs
4. **Files to Create**: New files needed
5. **Implementation Steps**: Ordered list of tasks
6. **Testing Strategy**: How to verify it works
7. **Risks/Considerations**: Edge cases, potential issues

## Step 6: Save the Spec

**Naming convention**: `<issue-id>-<topic>.md`

Examples:
- `GTMENG-410-webhook-refactor.md` (with issue ID)
- `dark-mode-implementation.md` (without issue ID)

Write the spec to `<git-root>/<specsLocation>/<filename>.md` (use location from config, default `.sessions/specs/`)

Use this template:
```markdown
# Spec: [TOPIC]

**Created**: [DATE]
**Issue**: [ISSUE-ID or N/A]
**Status**: Draft

## Overview

[What and why]

## Approach

[High-level strategy]

## Files to Modify

- `path/to/file.ts` - [what changes]
- `path/to/other.ts` - [what changes]

## Files to Create

- `path/to/new.ts` - [purpose]

## Implementation Steps

1. [ ] Step one
2. [ ] Step two
3. [ ] Step three

## Testing Strategy

- [ ] Unit tests for X
- [ ] Integration test for Y
- [ ] Manual verification of Z

## Risks & Considerations

- [Risk 1]
- [Risk 2]
```

## Step 7: Link to Session Context

Add a reference to the spec in `<git-root>/.sessions/index.md` under Current State or relevant section.

## Step 8: Confirm

Present the spec summary and ask if the user wants to:
- Proceed with implementation
- Refine the spec
- Save for later

## Spec Lifecycle

Specs are **temporary artifacts** - they exist to guide implementation:

1. **Draft** → Created, ready for review
2. **In Progress** → Being implemented
3. **Completed** → Implementation done

**When a spec is fully implemented**:
- If it contains reusable reference material (architecture decisions, patterns), move that content to `docs/`
- Delete the spec file - the archive will have the record of what was accomplished
- Don't let specs accumulate; they should flow through to completion or be abandoned
