# Handoff

## Outcome

A fresh session can pick up this task by pasting the brief as its opening prompt — nothing else required.

## Acceptance Criteria

- A self-contained brief is written to `~/.bonfire/handoffs/<slug>.md` (create the directory if missing)
- The brief is a complete prompt: problem, evidence, proposed approach, and pointers to artifacts (repo URL, PR, files, tests). Stands alone with zero references to "as we discussed" or "see above."
- Slug derives from the argument or the brief's first line (kebab-case)
- The current session continues uninterrupted

## Constraints

- One handoff = one focused effort. If it's larger than a PR, file a ticket instead.
- Don't mirror canonical sources. Link the repo, PR, commit, or issue; don't paraphrase them.
- The brief is a one-shot prompt. Durable status lives in the PR or issue, not the file.
- Handoffs are global by design — the consuming session may be in a different repo or no repo at all.
