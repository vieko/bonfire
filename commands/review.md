---
description: Review work for blindspots, gaps, and improvements
allowed-tools: Bash(git:*), Bash(gh:*), Bash(linear:*), Read, Write, Task
---

# Review Work

Strategic review using subagent for analysis, preserving main context for action decisions.

## Step 1: Determine Scope

Based on $ARGUMENTS:
- No args: Review current branch vs base
- `--session`: Review work captured in current session context
- Topic/area: Focus review on specific aspect

## Step 2: Gather Context

- Read session context from `<git-root>/.bonfire/index.md`
- Get branch diff: `git diff main...HEAD` (or appropriate base)
- Read relevant specs/docs from `.bonfire/`
- Understand intent: what were we trying to accomplish?

## Step 3: Run Review (Subagent)

**Progress**: Tell the user "Reviewing work for blindspots and gaps..."

Use the Task tool to invoke the **work-reviewer** subagent.

Provide the review context:

```
Review this work for blindspots, gaps, and improvements.

**Scope**: [Branch diff / session work / specific area]

**Intent**: [What we were trying to accomplish - from session context]

**Files changed**:
[List of modified files from git diff]

**Session context**:
[Relevant notes from index.md]

Return categorized findings with severity and effort estimates.
```

**Wait for the subagent to return findings** before proceeding.

The subagent runs in isolated context (sonnet model), preserving main context for action decisions.

### Review Validation

After the subagent returns, validate the response:

**Valid response contains:**
- `## Summary` with finding counts
- At least one of: `## Fix Now`, `## Needs Spec`, or `## Create Issues`

**On valid response**: Proceed to Step 4.

**On partial response** (missing categories but has findings):
1. Warn user: "Review returned partial results. Some categories may be missing."
2. Present available findings.
3. Continue to Step 4.

**On invalid/empty response**:
1. Warn user: "Review subagent returned no findings. I'll review directly."
2. Fall back to in-context review:
   - Read changed files from git diff
   - Analyze for common issues (missing tests, error handling, etc.)
   - Check for TODOs and incomplete implementations
3. Present in-context findings using the same format.

**On subagent failure** (timeout, error):
1. Warn user: "Review subagent failed. Continuing with direct review."
2. Perform in-context review as above.

### Resumable Review (Large Changes)

For large changesets, review may need multiple passes. The Task tool returns an `agentId` you can use to resume.

**When to offer resume:**
- Review covers many files and user wants deeper analysis of specific area
- Findings mention "additional items omitted" or suggest areas need more attention
- User wants to focus review on specific aspect (e.g., "look more at tests")

**To resume review:**
1. Tell user: "Review covered [X]. Want deeper analysis of [specific area]?"
2. If yes, re-invoke work-reviewer with the `resume` parameter:
   - Pass the agentId from the previous invocation
   - Provide a focused directive: "Continue review focusing on: [specific area]."
3. Merge findings from resumed review with previous findings.
4. Repeat if needed, up to 3 passes maximum.

**Example multi-pass scenario:**
- Pass 1: General review → finds 5 issues, notes "test coverage not analyzed"
- Pass 2 (resume): "Continue review focusing on: test coverage" → finds 3 more test gaps
- Merge: Combined findings give complete picture

## Step 4: Present Findings

Present the subagent's findings grouped by recommended action:

### Fix Now (trivial effort)
[List items from subagent that can be fixed immediately]

> Ask: "Want me to fix these now?"

### Needs Spec (important, needs planning)
[List items that need implementation planning]

> Ask: "Want me to create an implementation spec?"

### Create Issues (large effort or nice-to-have)
[List items for future sessions]

> Ask: "Want me to create GitHub/Linear issues?"

## Step 5: Execute Chosen Action

Based on user choice:
- **Fix now**: Make the changes directly
- **Spec**: Run `/bonfire:spec` with findings
- **Create issues**: See below

### Creating Issues

First, read `<git-root>/.bonfire/config.json` and check `linearEnabled`.

**Offer choices based on config:**
- Always offer: "Create GitHub issue"
- If `linearEnabled` is true: Also offer "Create Linear issue"

**GitHub Issue Creation:**
```bash
gh issue create --title "Finding title" --body "Finding details"
```

**Linear Issue Creation (if enabled):**
1. Use linear-cli to create the issue:
   ```bash
   linear issue create --title "Finding title" --description "Finding details"
   ```
2. On success: Return issue URL/ID
3. On failure: Warn user, offer to create GitHub issue instead

Note: Run `linear issue create --help` to see available options (team, priority, labels, etc.).

**For each created issue:**
- Record the issue ID and URL
- Note which tracker (GitHub/Linear) was used

## Step 6: Update Session Context

Add review outcomes to `<git-root>/.bonfire/index.md`:
- Key findings noted
- Issues created (with links)
- Work deferred to future sessions
