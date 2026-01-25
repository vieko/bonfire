---
name: document
description: Create documentation about a topic in the codebase
argument-hint: <topic>
disable-model-invocation: true
allowed-tools: Read, Write, Bash(git:*), Task
---

# Document Topic

Create reference documentation for **$ARGUMENTS**.

---

## Outcome

Complete reference documentation that helps developers understand a system, feature, or pattern in the codebase. The doc should enable someone unfamiliar with the code to:
- Understand what it does and why it exists
- Find the relevant files quickly
- Understand how it works at a conceptual level
- Avoid common pitfalls

---

## Acceptance Criteria

The doc file must contain these sections:

| Section | Purpose |
|---------|---------|
| `## Overview` | What this is and why it matters |
| `## Key Files` | Important files with their roles |
| `## How It Works` | Conceptual explanation of flow/behavior |
| `## Gotchas` | Edge cases, pitfalls, things to watch out for |

Additional sections are welcome (Architecture, Examples, Related Topics) but these four are required.

**Quality signals:**
- File paths are accurate and exist in the codebase
- Explanations match actual code behavior
- Gotchas reflect real issues (not hypothetical concerns)

---

## Constraints

### Context Isolation

Research happens in an isolated subagent context to preserve main context.

| Phase | Agent | Model | Why |
|-------|-------|-------|-----|
| Research | `bonfire:codebase-explorer` | haiku | Fast exploration without polluting main context |
| Writing | `bonfire:writer` | inherit | Synthesis in isolation with full research context |

Use the Task tool with the appropriate agent. The subagents have `user-invocable: false` so they're only accessible via Task.

### No Interview Required

Unlike specs, documentation is based purely on codebase research. The code is the source of truth.

### File Locations

- **Config**: `<git-root>/.bonfire/config.json` contains `docsLocation`
- **Default**: `.bonfire/docs/` if not configured
- **Naming**: `<topic>.md` (kebab-case, e.g., `authentication-flow.md`)

### Verification

After writing, verify the doc contains all 4 required sections. If incomplete:
- Warn user what's missing
- Offer: proceed / retry / abort

### Session Context

After writing, add a reference to the doc in `<git-root>/.bonfire/index.md` under Key Resources.

### Completion

After verification, confirm doc creation and offer options:
- Add more detail to any section
- Document related topics
- Proceed with other work

---

## Guidance (Not Rules)

These patterns tend to work well, but adapt as needed:

**Research before writing** - Let the codebase inform the structure.

**Show your work** - Tell user what you're doing: "Exploring codebase...", "Writing documentation..."

**Fallback gracefully** - If subagent fails, do the work in main context. Warn user but don't stop.

**Large codebases** - Explorer may need multiple passes. Offer to continue if findings seem incomplete for the topic.

**Follow the code** - Document what the code actually does, not what comments claim or what you assume.

**Writer context** - When invoking the writer agent, specify document type as "doc" so it uses the correct format.

---

## Anti-Patterns

**Don't document assumptions** - If you can't find it in the code, don't write about it.

**Don't over-abstract** - Concrete file paths and function names are more useful than vague descriptions.

**Don't skip verification** - Subagents can produce partial output. Always check.

**Don't write tutorials** - This is reference documentation (how it works), not a guide (how to use it).
