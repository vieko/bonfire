---
description: Review work for blindspots, gaps, and improvements
allowed-tools: Bash(git:*), Bash(gh:*), Read, Glob, Grep, Write, mcp__linear__*
---

# Review Work

## Step 1: Determine Scope

Based on $ARGUMENTS:
- No args: Review current branch vs base
- `--session`: Review work captured in current session context
- Topic/area: Focus review on specific aspect

## Step 2: Gather Context

- Read session context from `<git-root>/.sessions/index.md`
- Get branch diff: `git diff main...HEAD` (or appropriate base)
- Read relevant specs/docs from `.sessions/`
- Understand intent: what were we trying to accomplish?

## Step 3: Check Project Config

Read `<git-root>/.sessions/config.json` if it exists.

**Model preference**: If `models.review` is set to something other than "inherit":
- If "opus": Be thorough, find subtle issues, architectural concerns
- If "sonnet": Balance depth with efficiency
- If "haiku": Focus on obvious issues, be quick

If "inherit" or not set, proceed with current conversation model.

## Step 4: Strategic Review

Analyze the work asking:

**Blindspots**: What are we not seeing?
- Edge cases not handled
- Error scenarios not considered
- User flows not covered
- Dependencies not accounted for

**Gaps**: What's incomplete?
- Missing tests
- Missing documentation
- Incomplete implementations
- TODOs left unaddressed

**Quick Wins**: What small improvements would add significant value?
- Easy refactors
- Low-hanging performance gains
- Simple UX improvements

**Best Practices**: Are we following conventions?
- Project patterns
- Language/framework idioms
- Security practices
- Accessibility standards

**Maintainability**: Will future-us thank present-us?
- Clear naming and structure
- Appropriate abstractions
- Technical debt introduced

## Step 5: Session Scripts Review

Check if `<git-root>/.sessions/scripts/` contains any files.

If scripts exist, include in findings:
- List scripts that may need attention
- Note if any appear to be temporary/one-off vs reusable
- Suggest moving useful scripts to project `scripts/` directory

This is informational - actual script management happens during `/sessions:end`.

## Step 6: Categorize Findings

For each finding, determine:
- **Severity**: blocking | important | nice-to-have
- **Effort**: trivial | small | medium | large
- **Action**: fix-now | spec | create-issue

## Step 7: Present and Act

Present findings grouped by recommended action:

### Fix Now (trivial effort)
[List items that can be fixed immediately]

→ Ask: "Want me to fix these now?"

### Spec (small/medium effort, important)
[List items worth addressing this session]

→ Ask: "Want me to create an implementation spec?"

### Create Issues (large effort or nice-to-have)
[List items for future sessions]

→ Ask: "Want me to create GitHub/Linear issues?"

## Step 8: Execute Chosen Action

Based on user choice:
- **Fix now**: Make the changes directly
- **Spec**: Run `/sessions:spec` with findings
- **Create issues**: See below

### Creating Issues

First, read `<git-root>/.sessions/config.json` and check `linearEnabled`.

**Offer choices based on config:**
- Always offer: "Create GitHub issue"
- If `linearEnabled` is true: Also offer "Create Linear issue"

**GitHub Issue Creation:**
```bash
gh issue create --title "Finding title" --body "Finding details"
```

**Linear Issue Creation (if enabled):**
1. Use Linear MCP `linear_create_issue` tool with:
   - `title`: Finding summary
   - `description`: Finding details with context
   - `teamId`: Infer from session context if available, otherwise use default
2. On success: Return issue URL/ID
3. On failure: Warn user, offer to create GitHub issue instead

Note: Tool names may vary by Linear MCP implementation.

**For each created issue:**
- Record the issue ID and URL
- Note which tracker (GitHub/Linear) was used

## Step 9: Update Session Context

Add review outcomes to `<git-root>/.sessions/index.md`:
- Key findings noted
- Issues created (with links)
- Work deferred to future sessions
