# 03: Check clashes on date creation and show them on the edit page

**What to build:** Whenever the owner adds Proposed Dates to a Postponement (single add or generator run), the edit flow fetches each team's click-tt schedule once, computes Clashes for all dates via the pure module, and persists them on the Proposed Dates before saving. Each Proposed Date row on the edit page then shows one line per affected team with the game's localized time and opponent; a clean check shows "checked, no clashes"; a Postponement without team identities shows "not checked"; a failed scrape shows nothing (page still renders). The optional clash property is added to the Proposed Date model; old sessions render as today.

**Blocked by:** 01, 02

**Status:** ready-for-agent

- [ ] Single-add and generator paths both fetch once per team, compute, persist, and save
- [ ] Edit page rows render clash lines, "checked, no clashes", "not checked", and failure-nothing states correctly
- [ ] A failed scrape never blocks the date being added or the page rendering
- [ ] Hand-entered matches show "not checked" and never trigger a fetch
- [ ] Sessions without clash data render unchanged