---
description: Start a new session - reads context and scaffolds .sessions/ if needed
allowed-tools: Bash(git:*), Bash(gh:*), Bash(mkdir:*), Read, Write, Glob
---

# Start Session

## Step 1: Find Git Root

Run `git rev-parse --show-toplevel` to locate the repository root. All session files live at `<git-root>/.sessions/`.

## Step 2: Check for Sessions Directory

Check if `<git-root>/.sessions/index.md` exists.

**If .sessions/ does NOT exist**, scaffold it:

1. Tell the user: "No sessions directory found. Let me set that up for you."

2. Ask which git strategy they prefer:
   - **Ignore all** (recommended) - Keep sessions completely local, private by default
   - **Hybrid** - Commit docs/plans, keep working notes private
   - **Commit all** - Share everything with team

3. Create the directory structure:
   ```
   .sessions/
   ├── index.md
   ├── archive/
   ├── plans/
   ├── prep/
   ├── docs/
   └── .gitignore (based on chosen strategy)
   ```

4. Detect project name from: package.json name → git remote → directory name

5. Create `index.md` with template:
   ```markdown
   # Session Context: [PROJECT_NAME]

   **Date**: [CURRENT_DATE]
   **Status**: Active
   **Branch**: main

   ---

   ## Current State

   [Describe what you're working on]

   ---

   ## Recent Sessions

   ### Session 1 - [CURRENT_DATE]

   **Goal**: [What you want to accomplish]

   **Accomplished**:
   - [List completed items]

   **Decisions**:
   - [Key decisions made]

   **Blockers**: None

   ---

   ## Next Session Priorities

   1. [Priority items]

   ---

   ## Notes

   [Any additional context]
   ```

6. Create `.gitignore` based on chosen strategy:

   **Ignore all**:
   ```
   *
   !.gitignore
   ```

   **Hybrid**:
   ```
   *
   !.gitignore
   !docs/
   !docs/**
   !plans/
   !plans/**
   !README.md
   !WORKSPACE.md
   ```

   **Commit all**:
   ```
   data/
   scratch/
   ```

7. Check for monorepo (pnpm-workspace.yaml, package.json workspaces, lerna.json, turbo.json):
   - If detected, create `.sessions/packages/` directory
   - Create `WORKSPACE.md` listing detected packages

8. Create `.sessions/.version` with `1.0.0`

**If .sessions/ EXISTS**, proceed to Step 3.

## Step 3: Read Session Context

Read `<git-root>/.sessions/index.md` and report when ready.

Check if `<git-root>/.sessions/WORKSPACE.md` exists (don't error if missing). If it exists, mention that monorepo support is active and show detected packages.

Summarize:
- Current state
- Recent work
- Next priorities

Then ask: "What do you want to work on this session?"

## Step 4: Fetch External Context (Optional)

**Only fetch if user provides a new URL or issue ID:**

If user provides a GitHub/Linear URL or issue ID:
- **GitHub**: `gh pr view [URL] --json title,body,state,labels`
- **GitHub**: `gh issue view [URL] --json title,body,state,labels`
- **Linear**: If Linear MCP is configured, use available Linear tools to fetch issue
- Summarize the fetched context
- Store in `<git-root>/.sessions/prep/YYYY-MM-DD-topic.md`
- Add reference to index.md

Otherwise (continuing work, ad-hoc task, etc.):
- Proceed with existing session context
- Session notes are the source of truth for ongoing work

Confirm understanding and ask how to proceed.
