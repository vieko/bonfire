---
description: Start a new session - reads context and scaffolds .sessions/ if needed
allowed-tools: Bash(git:*), Bash(gh:*), Bash(mkdir:*), Read, Write, Glob, AskUserQuestion
model: haiku
---

# Start Session

## Step 1: Find Git Root

Run `git rev-parse --show-toplevel` to locate the repository root. All session files live at `<git-root>/.sessions/`.

## Step 2: Check for Sessions Directory

Check if `<git-root>/.sessions/index.md` exists.

**If .sessions/ does NOT exist**, scaffold it:

1. Tell the user: "No sessions directory found. Let me set that up for you."

2. Use a single AskUserQuestion call with all 4 questions:

   1. "What model for `/sessions:plan`?" (Header: "Plan")
      - inherit (Recommended) - Use conversation model
      - opus - Deep architectural reasoning
      - sonnet - Balanced speed/quality
      - haiku - Fast, lightweight

   2. "What model for `/sessions:document`?" (Header: "Document")
      - Same options as above

   3. "What model for `/sessions:review`?" (Header: "Review")
      - Same options as above

   4. "How should `.sessions/` be handled in git?" (Header: "Git")
      - ignore-all (Recommended) - Keep sessions private/local
      - hybrid - Commit docs/plans, keep notes private
      - commit-all - Share everything with team

3. Create the directory structure:
   ```
   .sessions/
   ├── index.md
   ├── config.json
   ├── archive/
   ├── plans/
   ├── docs/
   └── .gitignore
   ```

4. Detect project name from: package.json name → git remote → directory name

5. Create `config.json` with user's answers:
   ```json
   {
     "models": {
       "plan": "<user-answer>",
       "document": "<user-answer>",
       "review": "<user-answer>"
     },
     "gitStrategy": "<user-answer>"
   }
   ```

6. Create `index.md` with template:
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

   ## Key Resources

   **Code References**:
   - [Component/feature]: `path/to/file.ts`

   **External Links**:
   - [Issue Tracker](url)

   ---

   ## Archived Sessions

   [Links to archived sessions will appear here]

   ---

   ## Notes

   [Any additional context]
   ```

7. Create `.gitignore` based on chosen strategy:

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
   ```

   **Commit all**:
   ```
   data/
   scratch/
   ```

**If .sessions/ EXISTS**, proceed to Step 3.

## Step 3: Check/Update CLAUDE.md

Check if `<git-root>/CLAUDE.md` exists.

**If CLAUDE.md does NOT exist**, create it:
```markdown
# [PROJECT_NAME]

## Quick Context

Read `.sessions/index.md` for current project state, recent work, and priorities.

## Session Commands

- `/sessions:start` - Start a session (reads context)
- `/sessions:end` - End session (updates context)
- `/sessions:plan` - Create implementation plan
- `/sessions:document <topic>` - Document a topic
- `/sessions:review` - Review work for blindspots and improvements
- `/sessions:archive` - Archive completed work
- `/sessions:configure` - Change project settings
```

**If CLAUDE.md EXISTS**, check if it references `.sessions/index.md`. If not, append:
```markdown

## Session Context

Read `.sessions/index.md` for current project state, recent work, and priorities.
```

## Step 4: Read Session Context

Read `<git-root>/.sessions/index.md` and report when ready.

Summarize:
- Current state
- Recent work
- Next priorities

Then ask: "What do you want to work on this session?"

## Step 5: Fetch External Context (Optional)

**Only fetch if user provides a new URL or issue ID:**

If user provides a GitHub/Linear URL or issue ID:
- **GitHub**: `gh pr view [URL] --json title,body,state,labels`
- **GitHub**: `gh issue view [URL] --json title,body,state,labels`
- **Linear**: If Linear MCP is configured, use available Linear tools to fetch issue
- Summarize the fetched context
- Add reference to index.md under Current State

Otherwise (continuing work, ad-hoc task, etc.):
- Proceed with existing session context
- Session notes are the source of truth for ongoing work

Confirm understanding and ask how to proceed.
