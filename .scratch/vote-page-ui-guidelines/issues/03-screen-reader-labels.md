# 03: Screen-reader labels on the vote page

**What to build:** A screen-reader user hears what each control does. The "Set all" buttons are announced as "Set all: Yes", "Set all: if necessary", "Set all: No" (visible text unchanged); each Proposed Date's Venue chip exposes the full Venue name ("1 – Turnhalle orange, UG, Schule Dennigkofen") through visually-hidden text instead of a `title`, so touch and keyboard reach it; and the "Your votes have been saved!" message is announced politely (`role="status"`) rather than as an alert. The edit page shares the Venue chip and keeps its meaning.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] Set-all buttons are found by accessible name "Set all: Yes" / "Set all: if necessary" / "Set all: No"; visible labels are unchanged
- [x] The set-all accessible name comes from a new translation key in both locales
- [x] The Venue chip has no `title` attribute and carries the full Venue name as visually-hidden text when it differs from the visible label
- [x] The saved message has role `status`
- [x] Vote label casing is unchanged (still "if necessary")
- [x] `checkA11y` passes on the vote page; edit-page chip baselines updated if needed
- [x] `npm run verify` passes

## Comments

- Implementation `d295ebc`: new `vote_set_all_aria_label` key in both locales, set-all `aria-label`s, toast `role="status"`, `VenueBadge` drops `title` and adds visually-hidden full name, plus view/e2e/translations tests.
- Review `3e8a3c2`: 0 findings on both axes (2 non-actionable judgement notes); no fix commit needed. Review: `.scratch/vote-page-ui-guidelines/reviews/03-screen-reader-labels.md`.
- No screenshot baselines changed: the hidden text is visually hidden and the edit page keeps its own venue chip (it never used `VenueBadge`).
- `npm run verify` passed (lint, unit, build, 122 e2e). Two unrelated e2e tests flaked once under full-suite parallel load and pass in isolation and on re-run.
