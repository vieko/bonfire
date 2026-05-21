---
disable-model-invocation: true
---

# Migrate Legacy Index (fallback)

## Outcome

A pre-v7 `<git-root>/.bonfire/index.md` becomes v7.0-compliant: the v1 fence pair appears at the top, the legacy `## In flight` heading is renamed to the canonical curated heading (`## Notes`), the legacy `## Sessions` content is moved out to the canonical sidecar (`<git-root>/.bonfire/log.md`), and everything else in the file is preserved byte-for-byte in its original relative position. Adapters take over auto-updates on the next session without destroying any of the user's prior curation.

## When to use this

- One-off, manual trigger: `/skill:bonfire migrate` (or your host's equivalent).
- After installing Bonfire 7.0+ on a repo whose `index.md` predates fences. The Pi adapter surfaces this state in two places: the footer shows `△ !fences` (yellow), and a one-shot notify points at this exact command. The Claude adapter is silent on this state.
- Native adapters never run this automatically. They leave fenceless files alone by design — auto-fencing a curated file would be destructive.

## Acceptance Criteria

1. **Opt-in respected**: `<git-root>/.bonfire/` exists. If not, exit silently. (Same gate as `end.md`.)
2. **Per-repo opt-out respected**: if `<git-root>/.bonfire/config.json` has `{ "auto": false }`, exit silently.
3. **Idempotent**: if both v1 fence pairs are already present and well-formed (`<!-- bonfire:auto-inflight:start v1 -->` … `<!-- bonfire:auto-inflight:end -->` and the matching sessions pair), exit silently. Don't re-migrate.
4. **Empty-file shortcut**: if `index.md` doesn't exist, or contains only a YAML frontmatter + H1 and no other content, use [templates/index.md](../templates/index.md) directly. There's nothing to migrate; just bootstrap.
5. **Backup written** before rewriting `index.md`: copy the original to `<git-root>/.bonfire/index.md.pre-migrate-YYYY-MM-DD.bak`. If that path already exists, append a counter suffix (`...-1.bak`, `...-2.bak`, …). Never overwrite a prior backup.
6. **Migrated `index.md` shape**, top-to-bottom:
   1. Optional YAML frontmatter (preserved verbatim if present).
   2. The original H1 (preserved verbatim).
   3. `<!-- bonfire:auto-inflight:start v1 -->` block with a brief placeholder body explaining the next session will populate it.
   4. `<!-- bonfire:auto-sessions:start v1 -->` block, empty `## Sessions` body.
   5. A horizontal rule (`---`) separating the auto-managed region from the curated region.
   6. Any free-form prose between the H1 and the first H2 in the original (a "lead paragraph") — preserved verbatim, in its original position relative to surrounding sections (i.e. now between the boundary `---` and the next H2).
   7. The original `## In flight` content, with the heading renamed to `## Notes` — the canonical curated heading.
   8. **The original `## Sessions` section is removed from `index.md`** (its content is written to `log.md`, see criterion 7).
   9. Any other H2+ sections from the original file, in their original order, with original headings.
7. **Sidecar write** for legacy session content:
   - Write the original `## Sessions` block (the H2 heading itself plus all entries below it, up to but not including the next H2 or EOF) to `<git-root>/.bonfire/log.md`.
   - **Header prepended to the sidecar**: `_Migrated from index.md on YYYY-MM-DD_` followed by a blank line, then the H2 + content.
   - **Collision handling**: if `log.md` already exists, write to `<git-root>/.bonfire/log-pre-migrate-YYYY-MM-DD.md` instead (with counter suffix on collision). Never silently overwrite an existing `log.md`.
   - If the original file has no `## Sessions` section, skip the sidecar write entirely (no empty file).
8. **Atomic writes**: both `index.md` and the sidecar are written via tmpfile + rename. Don't truncate in place.

## Constraints

- **Never delete legacy content.** The migration moves and relabels. The `index.md` backup is one safety net; the sidecar is another. Nothing should require restoring from either.
- **Never extract structure from legacy `## In flight` / `## Sessions` into the new fenced blocks.** That's the adapter's job on the next `session_compact` (Pi) or `Stop` (Claude). Leave the fenced bodies as minimal placeholders.
- **Never invent metadata.** The legacy sessions may have entries like `- **2026-05-20 (21)** — …` that look close to the v7 row format `- YYYY-MM-DD [host:id] branch — title`, but auto-converting requires synthesizing a host:id and branch we don't have. The migration moves the entries verbatim into the sidecar; the next real session writes the first real row into the fence.
- **Never invent sub-section headings** the user didn't have. If their `## In flight` was free-form prose, move it as free-form prose. Don't impose Goal/Progress/Blocked structure on legacy content.
- **Preserve frontmatter** byte-for-byte if present. Pre-v7 bonfire used `--- … ---` for `git`, `specs`, `issues` config keys.
- **Move only the two specific H2s** (`## In flight` and `## Sessions`). Other H2 sections — runbooks, checklists, notes — stay in `index.md` in their original position with their original headings.
- **Free-form prose anywhere in the file** (between H2 sections, after the trailing H2, etc.) stays in its original position relative to surrounding sections. The migration only inserts the fence prefix and relocates the two specific H2s.

## Anti-goals

- Don't summarize, prune, or "clean up" legacy content. Even content that looks stale might be deliberate.
- Don't autoflag whether the new fenced shape "looks right." The adapter or `/skill:bonfire end` populates the fenced regions on the next session.
- Don't rewrite or normalize the H1.
- Don't infer the user's curation intent from filenames or paths. Read what's in the file; preserve it.

## After migration

The next session in this repo populates the fenced regions automatically:

- **Pi**: triggered by any `session_compact`, or by `turn_end` self-heal once the diagnostic resolves to a non-`!fences` state.
- **Claude Code**: triggered on the next `Stop` event.
- **Fallback hosts (Codex, OpenCode, etc.)**: run `/skill:bonfire end` once after the migration to seed the fenced bodies.

`log.md` is yours to manage from this point forward. The adapter does not touch it — it's the canonical sidecar for sessions-row overflow (the fence caps at 5 newest) and for migrated legacy session content. Append, trim, restructure, or delete entries as you see fit.

## Worked example (informative, not normative)

**Before** (`~/.dotfiles/.bonfire/index.md`, abbreviated):

```markdown
# .dotfiles

**Last session**: 2026-05-20 (21) — bonfire 7.0 conceived, designed, built…

---

## In flight

**Open intents:**

- `internal-agents:vieko/lead-bot-instrumentation` is the live thread.
- Scourge (Mac Mini) deployment — see checklist below.

**Closed (for the record):**

- [pi#4811] was auto-closed by the new-contributor bot.

---

## Sessions

- **2026-05-20 (21)** — bonfire 7.0 conceived, designed, built…
- **2026-05-19 (20)** — nvim 0.11/0.12 cleanup pass…
- (15 more entries…)

---

## Scourge deployment checklist

```bash
git clone git@github.com:vieko/.dotfiles ~/.dotfiles
…
```
```

**After** (`~/.dotfiles/.bonfire/index.md`):

```markdown
# .dotfiles

<!-- bonfire:auto-inflight:start v1 -->
## In flight

_Awaiting next session. Your bonfire adapter will populate this section on the next compaction or assistant turn. Until then, see `## Notes` below for curated state._
<!-- bonfire:auto-inflight:end -->

<!-- bonfire:auto-sessions:start v1 -->
## Sessions
<!-- bonfire:auto-sessions:end -->

---

**Last session**: 2026-05-20 (21) — bonfire 7.0 conceived, designed, built…

---

## Notes

**Open intents:**

- `internal-agents:vieko/lead-bot-instrumentation` is the live thread.
- Scourge (Mac Mini) deployment — see checklist below.

**Closed (for the record):**

- [pi#4811] was auto-closed by the new-contributor bot.

---

## Scourge deployment checklist

```bash
git clone git@github.com:vieko/.dotfiles ~/.dotfiles
…
```
```

**Also written** (`~/.dotfiles/.bonfire/log.md`, new sidecar):

```markdown
_Migrated from index.md on 2026-05-21_

## Sessions

- **2026-05-20 (21)** — bonfire 7.0 conceived, designed, built…
- **2026-05-19 (20)** — nvim 0.11/0.12 cleanup pass…
- (15 more entries…)
```

`index.md` shrinks from ~12 KB to ~3 KB (auto-managed + curated + runbook). `log.md` carries the ~9 KB of historical session narratives, accessible when wanted but no longer diluting the daily-read file. The `△ !fences` diagnostic clears on the next session_start once the adapter sees the v1 markers.
