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
