# 04: Fix warning-chip contrast to WCAG AA

**What to build:** Make the edit page's "hall busy" (Venue Occupancy) warning chip readable for low-vision users. Point the warning chip's background and foreground tokens at the framework's warning container pair so the text contrast is at least 4.5:1 (it is currently 3.95–4.24:1 against a 4.5:1 minimum). The chip selector itself does not change — only the two token values — so the fix lives in one place and matches the existing occupancy warning treatment.

**Blocked by:** 03

**Status:** ready-for-agent

- [x] The warning chip's text contrast against its background is at least 4.5:1 (axe on the edit page is green).
- [x] The chip's class and markup are unchanged; only token values changed.
- [x] Edit-page screenshot baselines are regenerated and reviewed before commit.
- [x] `npm run lint`, `npm run test` and `npm run e2e` pass.
