---
description: Create documentation about a topic in the codebase
allowed-tools: Read, Write, Glob, Grep, Bash(git:*)
---

# Document Topic

## Step 1: Find Git Root

Run `git rev-parse --show-toplevel` to locate the repository root.

## Step 2: Understand the Topic

The topic to document is: $ARGUMENTS

If no topic provided, ask the user what they want documented.

## Step 3: Explore the Codebase

Launch a thorough exploration to understand the topic:
- Search for relevant files and patterns
- Read key implementation files
- Understand the architecture and flow
- Note important details, gotchas, and decisions

## Step 4: Create Documentation

Create documentation in `<git-root>/.sessions/docs/<topic>.md`

Structure the documentation with:
- **Overview**: What this is and why it exists
- **Architecture**: How it's structured
- **Key Files**: Important files and their roles
- **How It Works**: Flow and behavior
- **Usage Examples**: How to use/modify it
- **Gotchas**: Things to watch out for
- **Related**: Links to related docs or code

## Step 5: Link to Session Context

Add a reference to the doc in `<git-root>/.sessions/index.md`.

## Step 6: Confirm

Summarize what was documented and ask if the user wants:
- More detail on any section
- Related topics documented
- To proceed with other work
