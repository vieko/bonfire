---
description: Create documentation about a topic in the codebase
allowed-tools: Read, Write, Glob, Grep, Bash(git:*)
---

# Document Topic

## Step 1: Find Git Root

Run `git rev-parse --show-toplevel` to locate the repository root.

## Step 2: Check Config

Read `<git-root>/.sessions/config.json` if it exists.

**Model preference**: If `models.document` is set to something other than "inherit", use that model for this task:
- If "opus": Be comprehensive, include deep architectural insights
- If "sonnet": Balance depth with clarity
- If "haiku": Be concise, focus on essentials

If "inherit" or not set, proceed with current conversation model.

**Docs location**: Read `docsLocation` from config. Default to `.sessions/docs/` if not set.

## Step 3: Understand the Topic

The topic to document is: $ARGUMENTS

If no topic provided, ask the user what they want documented.

## Step 4: Explore the Codebase

Launch a thorough exploration to understand the topic:
- Search for relevant files and patterns
- Read key implementation files
- Understand the architecture and flow
- Note important details, gotchas, and decisions

## Step 5: Create Documentation

**Naming convention**: `<topic>.md` (kebab-case)

Examples:
- `inbound-agent-architecture.md`
- `sampling-strategies.md`
- `authentication-flow.md`

Write the documentation to `<git-root>/<docsLocation>/<topic>.md` (use location from config, default `.sessions/docs/`)

Structure the documentation with:
- **Overview**: What this is and why it exists
- **Architecture**: How it's structured (use mermaid diagrams for complex flows)
- **Key Files**: Important files and their roles
- **How It Works**: Flow and behavior
- **Usage Examples**: How to use/modify it
- **Gotchas**: Things to watch out for
- **Related**: Links to related docs or code

Use this template:
```markdown
# [TOPIC]

## Overview

[What this is and why it exists]

## Architecture

[How it's structured]

```mermaid
flowchart TD
    A[Component A] --> B[Component B]
    B --> C[Component C]
```

## Key Files

| File | Purpose |
|------|---------|
| `path/to/file.ts` | [Description] |
| `path/to/other.ts` | [Description] |

## How It Works

[Step-by-step flow and behavior]

## Usage Examples

[Code examples, CLI commands, etc.]

## Gotchas

- [Thing to watch out for]
- [Common mistake]

## Related

- [Link to related doc](other-doc.md)
- [Code reference]: `path/to/file.ts`
```

## Step 6: Link to Session Context

Add a reference to the doc in `<git-root>/.sessions/index.md` under Key Resources or Notes.

## Step 7: Confirm

Summarize what was documented and ask if the user wants:
- More detail on any section
- Related topics documented
- To proceed with other work
