# Review: 01-auto-deselect-clashing-dates

Fixed point: `7a98c02^` (parent of the ticket commit). Only commit `7a98c02`
(ticket done) reviewed — the branch also carries concurrent ticket 02 commits.

## Standards

Sources: `AGENTS.md` (postpony conventions), repo skill docs, and the smell
baseline (Fowler ch.3).

- **No hard violations.** `tsc --noEmit`, `tsc -p tsconfig.e2e.json`, and
  `eslint . --max-warnings 0` all pass; coverage gate (`npm run test`) passes at
  >= 80%.
- Strong typing maintained (`readonly string[]` added-ids), `function`
  declarations, explicit return types, JSDoc consistent with file style.
- Judgement calls, all resolved in favour of the code as written:
  - *Middle Man (weak)*: `deselectClashingAddedDates` instantiates
    `PostponementRules` solely to call `setVotable`. The spec explicitly
    mandates reusing `setVotable` ("Deselect IS votable = false"), so the
    delegation is the documented design, not a smell.
  - *Duplicated Code (weak)*: the non-empty-clash predicate
    (`home.length > 0 || away.length > 0`) is a one-liner used once — not
    worth extracting. `attachClashes` remains shared with refresh (unchanged).
  - *Primitive Obsession (weak)*: ids travel as bare `string[]`; consistent
    with the existing domain API (`setVotable`, `confirmDate`).

## Spec

Spec: `.scratch/clash-auto-deselect/spec.md`. Ticket: `issues/01-...md`.

- All 8 acceptance boxes ticked and backed by tests:
  - single add, clashing -> `votable:false` + clash data (spec §Testing, item 1);
  - single add, clean -> `votable:true` (item 2);
  - generator run, mixed rows -> only clashing added dates false (item 3);
  - later proposal leaves pre-existing `votable` incl. a hand-flipped date (US 8);
  - hand-entered / failed scrape -> stays `votable:true` (US 9) — added
    assertions to the existing failed-scrape and hand-entered tests;
  - refresh handler (ticket criterion 5) unchanged; added an explicit
    "votable untouched" assertion to the existing refresh test.
  - edit page votable-off + clash chip + remains listed, vote page hides the
    clashing date while the clean date stays visible/votable (e2e updated).
- Design decisions honoured: no new field / no deletion; shared save path
  `saveWithClashCheck` keyed on the added date ids drives both single-add and
  generator; refresh handler untouched; undefined clash data is a no-op.
- No scope creep found. Behaviour added matches the ticket exactly (deselect at
  proposal time only, only for the dates named as added).
- Out of scope (noted, not findings): the ADR (0023) and CONTEXT.md glossary
  consolidation from spec "Further Notes" are not part of ticket 01's criteria.

## Summary

- Standards: 0 hard findings, 3 weakly-flagged judgement calls (all overridden
  by documented design). Worst: none.
- Spec: 0 findings (missing/partial/wrong), 0 scope creep. Worst: none.