# 07: E2E tests for the clash feature

**What to build:** Full-flow browser tests: an owner scrapes a match from click-tt (fixture mode), proposes dates, and sees Clash lines on both the edit page and the vote page; a hand-entered match shows "not checked" on both pages. At least one likely error path (scrape failure degrading gracefully) is covered.

**Blocked by:** 04

**Status:** ready-for-agent

- [ ] Happy path: scrape-created match with proposed dates shows clash info on edit and vote pages
- [ ] Hand-entered match shows "not checked" on both pages
- [ ] A failed schedule check degrades gracefully without breaking the flow