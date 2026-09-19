# 05: Vote page: week grouping with a hoisted venue chip

**What to build:** a long list of proposed dates on the vote page scans like the organizer's rail: dates group by ISO week under a week-range heading, reusing the exact grouping and heading treatment the edit surface uses. Because every proposed date in the fixture shares the same venue, the venue chip also stops repeating in all 18 legends: when every date in a week group resolves to the same venue, the chip renders once in the group heading (the full venue name stays exposed to assistive tech), and when venues differ within a group, each legend keeps its chip. Voting, tallies, and the save path behave unchanged.

**Blocked by:** 04 — Vote page: one heading, no duplicated title

**Status:** ready-for-agent

- [x] Dates group by week at real week boundaries under the same heading/range treatment as the organizer's rail.
- [x] When a week group's dates all share one venue, the chip renders once in the group heading and the per-date legends drop it; the full venue name is still announced to screenreaders.
- [x] When venues differ within a group, every legend keeps its own chip.
- [x] Grouping does not change what is votable, what the summary shows, or how a vote saves.
- [x] The render spec asserts grouping boundaries and chip hoisting; the join e2e shows the grouped headings on page.

## Comments

- `942f4bc` ticket done: 05-vote-page-week-grouping
- `875eb89` review: 05-vote-page-week-grouping

Summary: `VoteRegion` now groups the proposed dates by ISO week via the shared
`groupByWeek`/`RailGroupHeading` (label + `week-range`), with `RailGroupHeading`
given an optional `trailing` slot for the hoisted chip. When every date in a group
resolves to the same venue (`defaultVenueNumber`, so legacy dates are venue 1), the
chip renders once in the group heading — with the visually-hidden full venue name
intact — and the per-date legends become date-only; mixed-venue groups keep a chip
per legend. The occupancy extra clause rides only onto a shared chip when all rows
agree; otherwise it is dropped rather than misattributed. Seven new render tests
cover the grouping boundaries and hoisting cases; the full suite (1116 tests) and
`npm run lint` pass, `vote.tsx` coverage ≥ 90%.

Open item for the coordinator: criterion 5's e2e half. `e2e-tests/join-voting.e2e.ts`
lines 183-186 anchor the venue name on the per-date radio GROUP legend and will
break once the chip is hoisted; point it at the level-3 week heading and assert the
chip appears once per homogeneous group (details in the review file).