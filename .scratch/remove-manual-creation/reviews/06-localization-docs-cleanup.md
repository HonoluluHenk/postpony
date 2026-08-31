# Code Review — 06-localization-docs-cleanup

Fixed point: `0c51f71..HEAD` (commits `95d2721`, `4010f73`, `b245729`, `726d9c1`)
Spec: `.scratch/remove-manual-creation/spec.md` + ticket `06-localization-docs-cleanup.md`

## Standards

No documented-standard violations found.

- `src/locales/en.json` / `de.json`: the six spec-enumerated keys (`create_new`, `create_postponement_title`, `change_match_details`, `change_match_details_title`, `change_via_scrape`, `save_changes`) removed from both files in matching alphabetical positions, keeping the two files byte-for-byte key-parallel (verified via `diff` of the key lists). `match_summary` (ticket 04's key) untouched. fr-CH/it-CH need no edits — they map to `en.json` per ADR-0016.
- `CONTEXT.md` (Match glossary entry): rephrased to scrape-only creation with permanent binding, dropping "or entered by hand at creation" and the in-place change semantics. Keeps the `originalMatchDateTime`/`homeTeam`/`guestTeam` field mentions and the `_Avoid_` line. Matches the glossary's prose convention (no implementation detail).
- `docs/adr/0017-two-path-match-creation.md`: status line updated to "Superseded by ADR-0024", mirroring the ADR-0015 precedent ("Superseded by ADR-0016"). Body left intact as the historical record.
- `docs/adr/0024-scrape-only-match-creation.md`: new ADR, next number (0024), follows the repo's full ADR shape (Status / Context / Decision / Considered Options / Consequences). Decision bullets mirror the spec's Implementation Decisions (scrape-only mint, no change mode, read-only summary, `metadata` removed, identities retained).
- Ticket file: all four `- [ ]` boxes ticked.

Smell baseline — judgement calls only, none actionable:

- The spec's localization section enumerates exactly six keys as "keys that exist only for the removed features", but the deleted manual form also referenced `create_button`, `guest_team_required`, `home_team_required`, and `original_match_date_time_invalid` (verified via the pre-removal `create.tsx`/`create-post.tsx`). Those are now equally orphaned in the locale files but were left in place because the spec enumeration (and the task scope) names only the six. Follow-up cleanup if desired; not a defect of this ticket. `guest_team` and `original_match_date_time_label` are likewise only-referenced-by-locales and would be covered by the same sweep.

## Spec

Acceptance criteria:

1. Orphaned translation keys (the six enumerated) removed from `en.json`/`de.json`; fr-CH/it-CH continue to mirror English per ADR-0016 — all six gone from both files, no code reference to any of them remains (grep over `src/` + `e2e-tests/`), `match_summary` retained. ✔
2. Glossary `Match` entry states the Match is scraped from click-tt.ch at creation and not editable afterwards — reworded accordingly, the "or entered by hand" clause dropped, the "can be re-pointed" implication removed. ✔
3. ADR-0017 recorded as superseded by the scrape-only decision — status update on ADR-0017 plus a short successor ADR-0024 that records the scrape-only decision and why the manual path vanished. ✔
4. `verify` gate green with coverage ≥ 80% — **lint PASS, unit tests PASS (579), coverage ≥ 80% (Statements 88.36 / Branches 80.25 / Functions 92.09 / Lines 88.71), build PASS, e2e not run here.** This ticket's changes are pure docs/strings; per task scope e2e is owned by ticket 05 (in parallel) and may be red until its sweep lands. No e2e outcome is attributable to this ticket.

No scope creep: the CONTEXT.md reference to "ADR-0017 superseded by the scrape-only decision" and the new ADR-0024 both serve criterion 3. No missing behavior.

## Summary

Standards: 0 findings (worst: minor note that four additional manual-form keys are equally orphaned but outside the spec's enumeration). Spec: 0 findings (worst: criterion 4's e2e leg delegated to ticket 05). Clean, minimal, spec-faithful; six keys removed in parity, glossary + ADR supersession recorded correctly.