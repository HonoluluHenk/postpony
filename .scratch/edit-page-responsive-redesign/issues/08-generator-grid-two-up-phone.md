# 08: Proposed Dates Generator weekday grid two-up on phone

**What to build:** On a phone the Proposed Dates Generator shows its weekday time fields two days per row, and the gap between the from/to/venue controls and the weekday grid shrinks to standard spacing, so the form fits a screen. Weekdays remain fixed Monday–Sunday (ADR-0021).

**Blocked by:** 02 (Proposed Date card shows full date and all chips on every width)

**Status:** ready-for-agent

- [x] Below 600px the weekday rows lay out in two columns; at 600px and wider layout unchanged
- [x] Bottom spacing of the generator controls uses the standard spacing token instead of 3rem
- [x] Generating dates still works end to end at phone width (e2e)
- [x] `checkA11y` passes at phone; baselines regenerated
- [x] `npm run verify` passes

## Comments

- `29f7f46` ticket done — added a `generate-time-grid` class to the Proposed Dates Generator weekday `<ol>` and a phone-only (max-width:599px) two-column grid for the time fields (one-per-row unchanged at ≥600px); reduced `.generate-controls` bottom spacing from `3rem` to the `--space-5` standard token (1.5rem, not `--space-4`, because 1rem made the open time-picker popup crowd the From picker and fail the WCAG 2.2 target-offset scan); added an e2e test that proves the two-up fit + date generation at the phone viewport and one-per-row at desktop; regenerated the `edit-empty`/`edit-with-dates`/`edit-with-votes` baselines. `npm run verify` green (lint, coverage ≥80%, build, 109 e2e).
- `4ae6f38` review — clean two-axis pass; no blocking findings and no `review-fixed`. One documented judgement call: `--space-5` over the ticket's `--space-4` example, justified by the a11y target-offset overlap (captured in a ponytail comment). Weekday order (ADR-0021) unchanged.
