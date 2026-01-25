---
name: review-pr
description: Review a GitHub pull request and post inline comments
argument-hint: <pr-number>
disable-model-invocation: true
allowed-tools: Bash(git:*), Bash(gh:*), Read, Write, Task, AskUserQuestion
---

# Review Pull Request

Review a GitHub PR in an isolated worktree, then post inline comments on findings.

Git root: !`git rev-parse --show-toplevel`

## Step 1: Parse Arguments

Extract PR number from `$ARGUMENTS`:
- `333` or `#333` → PR number 333
- Empty → Show usage and abort

**Usage**: `/bonfire:review-pr <pr-number>`

If no PR number provided:
> "Usage: `/bonfire:review-pr <pr-number>`
>
> Example: `/bonfire:review-pr 333`"

## Step 2: Fetch PR Metadata

Get PR details:

```bash
gh pr view <number> --json number,title,headRefName,baseRefName,headRefOid,url,body,files
```

**If PR not found**: Abort with "PR #<number> not found in this repository."

Extract and store:
- `headRefName` - PR branch name
- `baseRefName` - Target branch (usually main)
- `headRefOid` - Commit SHA for inline comments
- `title` - PR title
- `url` - PR URL
- `files` - Changed files list

## Step 3: Compute Worktree Path

Compute worktree path: `<git-root>/../<repo-name>-pr-<number>-review`

Example: `/Users/vieko/dev/gtm` → `/Users/vieko/dev/gtm-pr-333-review`

## Step 4: Create Worktree

Create isolated worktree for PR branch:

```bash
git fetch origin <headRefName>
git worktree add <worktree-path> origin/<headRefName>
```

**On failure** (branch conflict, dirty state, etc.):

1. Check error message
2. If worktree already exists: Ask user "Worktree already exists. Remove and recreate?"
   - Yes: `git worktree remove <worktree-path> --force` then retry
   - No: Abort
3. If other error: Report error and abort with suggestion to check `git worktree list`

## Step 5: Get PR Diff

Get the diff for context:

```bash
git -C <worktree-path> diff origin/<baseRefName>...HEAD --stat
```

Get changed files:

```bash
git -C <worktree-path> diff origin/<baseRefName>...HEAD --name-only
```

## Step 6: Run Review (Subagent)

**Progress**: Tell the user "Reviewing PR for blindspots and gaps..."

Use the Task tool to invoke the **bonfire:work-reviewer** subagent.

Provide the review context:

```
Review this pull request for blindspots, gaps, and improvements.

**Scope**: PR #<number> - <title>

**PR Description**:
<body from PR>

**Files changed**:
<list of changed files>

**Worktree path**: <worktree-path>

Read the changed files from the worktree to understand the actual changes.
Return categorized findings with severity, effort, and specific file:line references.
```

**Wait for the subagent to return findings** before proceeding.

The subagent runs in isolated context (sonnet model), preserving main context for comment posting.

### Review Validation

After the subagent returns, validate the response:

**Valid response contains:**
- Findings with file:line references where applicable
- Severity categorization

**On subagent failure**: Fall back to in-context review using the diff.

## Step 7: Present Findings

Present the findings grouped by severity:

For each finding, show:
- File and line number (if applicable)
- Severity (critical/moderate/minor)
- Description

## Step 8: Batch Comment Selection

Ask user: "Which findings should I post as PR comments?"

Use AskUserQuestion with options:
1. "All" - post all findings
2. "Select" - user will specify which ones (e.g., "1, 3, 5")
3. "None" - skip commenting

If "Select" chosen, ask which finding numbers to post.

## Step 9: Post Comments

For each selected finding with a file:line reference, post an inline comment:

```bash
gh api repos/{owner}/{repo}/pulls/<number>/comments \
  -f body="**Review Finding**

<finding description>

*Severity: <severity> | Effort: <effort>*" \
  -f commit_id="<headRefOid>" \
  -f path="<file-path>" \
  -f line=<line-number>
```

For findings without line numbers, post as general PR comment:

```bash
gh pr comment <number> --body "**Review Finding**

<finding description>

*Severity: <severity> | Effort: <effort>*"
```

**Note**: GitHub only allows inline comments on files that are part of the PR diff. If a finding references a file not in the diff, post it as a general PR comment instead.

## Step 10: Cleanup Worktree

After commenting, ask: "Review complete. Remove worktree?"

If yes:
```bash
git worktree remove <worktree-path>
```

Report: "Worktree cleaned up. PR review complete."

## Step 11: Confirm

Summarize:
- PR reviewed: #<number> - <title>
- Findings: <count> total, <posted> posted as comments
- PR URL for reference
- Worktree status (cleaned up or retained)
