# 02: Vote page fits a 360px phone

**What to build:** On a 360px-wide screen the vote page no longer clips: the "Set all" row wraps so the "No" button is fully inside the viewport, each Proposed Date's Yes / if necessary / No radios wrap instead of overrunning the card (including longer German labels such as "notfalls"), and each radio label is at least 44px tall. Desktop keeps the current single-row layout. The Vote Summary and all other behaviour are unchanged.

**Blocked by:** 01 (Viewport harness gains a 360px phone)

**Status:** ready-for-agent

- [x] At `phoneSmall`, the "Set all" buttons (including "No") are fully inside the viewport
- [x] At `phoneSmall` with `?lang=de-CH`, every radio label of a Proposed Date is inside the viewport
- [x] A vote radio label's bounding box is at least 44px tall
- [x] Desktop layout still shows each date's radios on one row
- [x] `checkA11y` passes at `phoneSmall` and `desktop`
- [x] Vote-page screenshot baselines updated only where wrap/padding changed
- [x] `npm run verify` passes

## Comments

- Implementation `d8a147b`, review `eae14a8`. The set-all row now uses BeerCSS `.row.wrap`, `.vote-radio-group` gains `flex-wrap: wrap`, and each vote label gets `padding-block: var(--space-3)` (48px touch target); guards added in `viewport-smoke.e2e.ts` at `phoneSmall`/`desktop` (no review findings).
- `npm run verify` passed (125 e2e). No vote-page screenshot baseline exists and the join/edit baselines were untouched, so none needed updating.
- Repaired the git-ignored `.env`, which had `npm run e2e` output appended to it and made the Playwright webServer fail to start.
