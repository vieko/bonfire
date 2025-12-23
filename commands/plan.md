---
description: Create an implementation plan for a feature or task
allowed-tools: Read, Write, Glob, Grep, Bash(git:*)
---

# Create Implementation Plan

## Step 1: Find Git Root

Run `git rev-parse --show-toplevel` to locate the repository root.

## Step 2: Understand the Task

Ask the user what they want to plan if not already clear from $ARGUMENTS.

## Step 3: Research

Launch a thorough exploration:
- Search the codebase for relevant patterns
- Understand existing architecture
- Identify files that will need changes
- Note any dependencies or constraints

## Step 4: Design the Plan

Create a structured implementation plan:

1. **Overview**: What we're building and why
2. **Approach**: High-level strategy
3. **Files to Modify**: Specific files and what changes each needs
4. **Files to Create**: New files needed
5. **Implementation Steps**: Ordered list of tasks
6. **Testing Strategy**: How to verify it works
7. **Risks/Considerations**: Edge cases, potential issues

## Step 5: Save the Plan

Write the plan to `<git-root>/.sessions/plans/YYYY-MM-DD-<topic>.md`

Use this template:
```markdown
# Implementation Plan: [TOPIC]

**Created**: [DATE]
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

## Step 6: Link to Session Context

Add a reference to the plan in `<git-root>/.sessions/index.md` under Current State or relevant section.

## Step 7: Confirm

Present the plan summary and ask if the user wants to:
- Proceed with implementation
- Refine the plan
- Save for later
