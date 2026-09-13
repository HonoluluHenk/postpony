# 02: Proposed Date card shows full date and all chips on every width

**What to build:** On tablet and phone the Organizer sees the complete Proposed Date text (no "T…" truncation) and every Clash / Venue Occupancy / clean-check chip on each card; the action buttons wrap below the date instead of squeezing it.

**Blocked by:** 01 (Viewport-parameterised e2e harness)

**Status:** ready-for-agent

- [x] Card uses a minimum height, not a fixed height; details row does not hide overflow
- [x] Date text has no nowrap/ellipsis truncation and no hard max width
- [x] The card-wrapping media query applies below 993px (BeerCSS medium breakpoint), not only below 600px
- [x] e2e at tablet: full date text of the first Proposed Date visible; both check chips visible on a clean row; clash chip visible on a clash row
- [x] e2e at phone: same assertions
- [x] Desktop layout unchanged apart from removed truncation; screenshot baselines regenerated where changed
- [x] `npm run verify` passes

## Comments

- Implemented in `45333cd` (ticket done: 02-date-card-visible-all-widths); reviewed in `b5bfd76` (review: 02-date-card-visible-all-widths) — no issues found, no review-fixed commit.
- Summary: card uses `min-height: 7rem` (not fixed) and the details row no longer hides overflow; date text wraps naturally (nowrap/ellipsis/`max-width: 12.5rem` removed); card-wrapping media query widened to `@media (max-width: 992px)` while the generator grid stacking stays phone-only; tablet + phone e2e assert the full date text and every clean/clash chip. Desktop unchanged apart from the removed truncation — the venue badge shifts ~71px to the card's right edge (within the 2% screenshot tolerance), so an `--update-snapshots` run left the baselines byte-identical and no regeneration was needed.
