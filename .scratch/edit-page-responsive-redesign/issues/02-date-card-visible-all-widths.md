# 02: Proposed Date card shows full date and all chips on every width

**What to build:** On tablet and phone the Organizer sees the complete Proposed Date text (no "T…" truncation) and every Clash / Venue Occupancy / clean-check chip on each card; the action buttons wrap below the date instead of squeezing it.

**Blocked by:** 01 (Viewport-parameterised e2e harness)

**Status:** ready-for-agent

- [ ] Card uses a minimum height, not a fixed height; details row does not hide overflow
- [ ] Date text has no nowrap/ellipsis truncation and no hard max width
- [ ] The card-wrapping media query applies below 993px (BeerCSS medium breakpoint), not only below 600px
- [ ] e2e at tablet: full date text of the first Proposed Date visible; both check chips visible on a clean row; clash chip visible on a clash row
- [ ] e2e at phone: same assertions
- [ ] Desktop layout unchanged apart from removed truncation; screenshot baselines regenerated where changed
- [ ] `npm run verify` passes
