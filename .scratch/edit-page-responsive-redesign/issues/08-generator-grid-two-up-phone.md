# 08: Proposed Dates Generator weekday grid two-up on phone

**What to build:** On a phone the Proposed Dates Generator shows its weekday time fields two days per row, and the gap between the from/to/venue controls and the weekday grid shrinks to standard spacing, so the form fits a screen. Weekdays remain fixed Monday–Sunday (ADR-0021).

**Blocked by:** 02 (Proposed Date card shows full date and all chips on every width)

**Status:** ready-for-agent

- [ ] Below 600px the weekday rows lay out in two columns; at 600px and wider layout unchanged
- [ ] Bottom spacing of the generator controls uses the standard spacing token instead of 3rem
- [ ] Generating dates still works end to end at phone width (e2e)
- [ ] `checkA11y` passes at phone; baselines regenerated
- [ ] `npm run verify` passes
