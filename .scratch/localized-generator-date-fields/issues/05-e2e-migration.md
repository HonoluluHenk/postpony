# 05: Migrate generator e2e to locale tokens and cover the new pickers

**What to build:** The end-to-end test surface for the generator catches up to the localized From/To fields. The generator e2e fills From and To with locale tokens (en-US `MM/dd/yyyy`) instead of ISO strings, and the valid-range assertions still verify generated Proposed Dates fall within the picked window. The date-picker e2e is extended to open both the From and To pickers via their buttons, assert they write locale tokens, and run the accessibility check against an open picker, mirroring the existing Proposed Date picker coverage.

**Blocked by:** 04 (localized From/To fields and pickers in the generator)

**Status:** done

- [x] The generator e2e's valid-range and error-path cases fill From/To as locale tokens (en-US month-first) and pass.
- [x] The date-picker e2e opens each of From and To pickers via its button and asserts locale-token output.
- [x] An open From/To picker passes the accessibility check.
- [x] The full e2e suite is green with the localized fields.

## Comments

- `dbdca14` — all four criteria. Generator e2e fills From/To via en-US `MM/dd/yyyy` tokens (`EditPage.fillFromDate/fillToDate` → `isoToLocaleDateTokens`) with the valid-range window and each error path asserting echoed token values; date-picker e2e opens From and To via their buttons, asserts date-only pickers write `MM/dd/yyyy`, runs `checkA11y()` with each picker open, then closes them. Full suite: 91/91 (5 green full runs; one transient load-induced infra flake on run C, no retries configured). Supporting server change: `defaultGeneratorDateRange` in `proposed-dates-post.ts` keeps the generator From/To populated on every single-add/error partial re-render (shared with the GET prefill), which was the root cause of a deterministic axe white-on-white flag on empty `.field.label` inputs in the responsive e2e.