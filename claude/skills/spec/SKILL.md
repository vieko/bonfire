---
name: spec
description: Create an implementation spec for a feature or task
argument-hint: <topic>
disable-model-invocation: true
allowed-tools: Read, Write, Bash(git:*), AskUserQuestion, Task
---

# Create Implementation Spec

Create an implementation spec for **$ARGUMENTS**.

---

## Outcome

A complete implementation spec written to the configured specs location that captures:
- What to build and why
- Key decisions with rationale
- Concrete implementation steps
- Edge cases and error handling
- Testing approach and scope boundaries

---

## Acceptance Criteria

The spec file must contain these sections:

| Section | Purpose |
|---------|---------|
| `## Overview` | What this feature does and why it matters |
| `## Decisions` | Key technical choices with rationale |
| `## Implementation Steps` | Ordered, actionable steps to build it |
| `## Edge Cases` | Error handling, boundary conditions, failure modes |

Additional sections are welcome but these four are required.

**Quality signals:**
- Decisions reference actual codebase patterns (not generic advice)
- Implementation steps are specific to this codebase (file paths, function names)
- Edge cases reflect real constraints discovered in research

---

## Constraints

### Context Isolation

Research and writing happen in isolated subagent contexts to preserve main context for user interaction.

| Phase | Agent | Model | Why |
|-------|-------|-------|-----|
| Research | `bonfire:codebase-explorer` | haiku | Fast, cheap exploration without polluting main context |
| Writing | `bonfire:writer` | inherit | Synthesis in isolation; has full research + interview context |

Use the Task tool with the appropriate agent. The subagents have `user-invocable: false` so they're only accessible via Task.

### User Interview Required

The user must be interviewed before writing. Research informs questions; questions surface decisions the user wouldn't think to mention.

**Interview must cover:**
- Core technical decisions (patterns, approaches, tradeoffs)
- Edge cases and error handling preferences
- Testing approach
- Scope boundaries (what's explicitly out)

Use AskUserQuestion. Good questions are informed by research, about tradeoffs, and codebase-specific.

### File Locations

- **Config**: `<git-root>/.bonfire/config.json` contains `specsLocation`
- **Default**: `.bonfire/specs/` if not configured
- **Naming**: `<issue-id>-<topic>.md` or `<topic>.md`

### Verification

After writing, verify the spec contains all 4 required sections. If incomplete:
- Warn user what's missing
- Offer: proceed / retry / abort

### Session Context

After writing the spec, add a reference to it in `<git-root>/.bonfire/index.md` under Current State. This links the spec to the session that created it.

### Completion

After verification, confirm spec creation and offer options:
- Proceed with implementation
- Refine specific sections
- Save for later

---

## Guidance (Not Rules)

These patterns tend to work well, but adapt as needed:

**Research before interviewing** - Findings make questions specific and valuable.

**Three interview rounds** - Core decisions → Edge cases → Testing & scope. But collapse if user is time-constrained.

**Show your work** - Tell user what you're doing: "Researching...", "Starting interview...", "Writing spec..."

**Fallback gracefully** - If subagent fails, do the work in main context. Warn user but don't stop.

**Large codebases** - Explorer may need multiple passes. Offer to continue if findings seem incomplete.

**Writer context** - When invoking the writer agent, specify document type as "spec" so it uses the correct format.

---

## Anti-Patterns

**Don't ask generic questions** - "What features do you want?" wastes an interview slot.

**Don't skip the interview** - Research alone misses user intent. Interview alone misses codebase reality.

**Don't write without verification** - Subagents can produce partial output. Always check.

**Don't over-specify implementation** - Steps should guide, not micromanage. Leave room for implementation judgment.
