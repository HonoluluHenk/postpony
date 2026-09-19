# 05: Vote page: week grouping with a hoisted venue chip

**What to build:** a long list of proposed dates on the vote page scans like the organizer's rail: dates group by ISO week under a week-range heading, reusing the exact grouping and heading treatment the edit surface uses. Because every proposed date in the fixture shares the same venue, the venue chip also stops repeating in all 18 legends: when every date in a week group resolves to the same venue, the chip renders once in the group heading (the full venue name stays exposed to assistive tech), and when venues differ within a group, each legend keeps its chip. Voting, tallies, and the save path behave unchanged.

**Blocked by:** 04 — Vote page: one heading, no duplicated title

**Status:** ready-for-agent

- [x] Dates group by week at real week boundaries under the same heading/range treatment as the organizer's rail.
- [x] When a week group's dates all share one venue, the chip renders once in the group heading and the per-date legends drop it; the full venue name is still announced to screenreaders.
- [x] When venues differ within a group, every legend keeps its own chip.
- [x] Grouping does not change what is votable, what the summary shows, or how a vote saves.
- [x] The render spec asserts grouping boundaries and chip hoisting; the join e2e shows the grouped headings on page.