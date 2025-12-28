---
description: Create an implementation spec for a feature or task
allowed-tools: Read, Write, Glob, Grep, Bash(git:*), AskUserQuestion, Task
---

# Create Implementation Spec

A hybrid approach: research the codebase first, then interview with informed questions.

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

## Step 3: Gather Initial Context

Get the topic from $ARGUMENTS or ask if unclear.

Check for existing context:
- Read `<git-root>/.sessions/index.md` for project state
- Check for `SPEC.md` or `spec.md` in git root (user's spec template)
- If issue ID provided, note for filename

## Step 4: Research Phase

Launch a thorough codebase exploration. Look for:

**Patterns & Architecture**:
- How similar features are implemented
- Existing abstractions that could be reused
- Naming conventions and code organization

**Technical Constraints**:
- Dependencies and their limitations
- API boundaries and contracts
- Performance considerations

**Potential Conflicts**:
- Files that might need changes
- Areas where this feature intersects existing code
- Migration or backwards compatibility concerns

**Document your findings** - these inform the interview questions.

## Step 5: Interview Phase

Use AskUserQuestion to interview the user with **informed questions** based on research findings. Questions should be non-obvious and specific to what you discovered.

### Round 1: Core Decisions

Ask about fundamental approach based on patterns found:

Example questions (adapt based on actual findings):
- "I found [Pattern A] in `services/` and [Pattern B] in `handlers/`. Which pattern should this feature follow?"
- "The existing [Component] handles [X]. Should we extend it or create a new [Y]?"
- "I see [Library] is used for [purpose]. Should we use it here or try [Alternative]?"

### Round 2: Edge Cases & Tradeoffs

Based on Round 1 answers and research, ask about:
- Error handling approach
- Edge cases you identified
- Performance vs simplicity tradeoffs
- User experience considerations

Example questions:
- "What should happen when [edge case you found]?"
- "I found [potential conflict]. How should we handle it?"
- "[Approach A] is simpler but [tradeoff]. [Approach B] is more complex but [benefit]. Preference?"

### Round 3: Scope & Boundaries (if needed)

If scope is still unclear:
- What's explicitly out of scope?
- MVP vs full implementation?
- Dependencies on other work?

### Continue Until Complete

Keep asking rounds of questions until you have clarity on:
- [ ] Core approach and architecture
- [ ] Key technical decisions
- [ ] Error handling strategy
- [ ] Edge cases covered
- [ ] Testing approach
- [ ] Scope boundaries

Tell the user "I have enough to write the spec" when ready, or ask what's still unclear.

## Step 6: Write the Spec

Synthesize research + interview into a comprehensive spec.

**Naming convention**: `<issue-id>-<topic>.md`

Write to `<git-root>/<specsLocation>/<filename>.md`

Use this template:
```markdown
# Spec: [TOPIC]

**Created**: [DATE]
**Issue**: [ISSUE-ID or N/A]
**Status**: Draft

## Overview

[What we're building and why - from interview]

## Context

[Key findings from codebase research that informed decisions]

## Decisions

[Document key decisions made during interview with rationale]

- **[Decision 1]**: [Choice] - [Why]
- **[Decision 2]**: [Choice] - [Why]

## Approach

[High-level strategy synthesized from research + interview]

## Files to Modify

- `path/to/file.ts` - [what changes]

## Files to Create

- `path/to/new.ts` - [purpose]

## Implementation Steps

1. [ ] Step one
2. [ ] Step two
3. [ ] Step three

## Edge Cases

- [Edge case 1] → [How we handle it]
- [Edge case 2] → [How we handle it]

## Testing Strategy

- [ ] Unit tests for X
- [ ] Integration test for Y
- [ ] Manual verification of Z

## Out of Scope

- [Explicitly excluded items]

## Risks & Considerations

- [Risk 1]
- [Risk 2]

## Open Questions

- [Any remaining uncertainties]
```

## Step 7: Link to Session Context

Add a reference to the spec in `<git-root>/.sessions/index.md` under Current State.

## Step 8: Confirm

Present the spec summary. Ask if user wants to:
- Proceed with implementation
- Refine specific sections
- Add more detail to any area
- Save for later

## Interview Tips

**Good questions are:**
- Informed by research (not generic)
- About tradeoffs (not yes/no)
- Specific to the codebase
- Non-obvious (user wouldn't think to mention)

**Bad questions:**
- "What features do you want?" (too broad)
- "Should we add error handling?" (obvious)
- Generic without codebase context

**Examples of good informed questions:**
- "I found `UserService` uses repository pattern but `OrderService` uses direct DB access. Which approach?"
- "The `auth` middleware validates JWT but doesn't check permissions. Should this feature add permission checks or assume auth is enough?"
- "There's a `BaseController` with shared logic. Extend it or keep this feature standalone?"

## Spec Lifecycle

Specs are **temporary artifacts** - they exist to guide implementation:

1. **Draft** → Created, ready for review
2. **In Progress** → Being implemented
3. **Completed** → Implementation done

**When a spec is fully implemented**:
- If it contains reusable reference material, move to `docs/`
- Delete the spec file - archive has the record
- Don't let specs accumulate
