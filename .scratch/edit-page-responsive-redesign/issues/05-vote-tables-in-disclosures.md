# 05: Vote tables collapse into disclosures

**What to build:** The own-team Votes table and the home/away tally tables are each wrapped in a native disclosure, closed by default, with the existing heading inside the summary. The Organizer expands any of them with one tap or key press; the page is short by default even with many Proposed Dates.

**Blocked by:** 03 (Own-team Votes table stacks on phone)

**Status:** ready-for-agent

- [ ] Each of the three vote tables sits in a `details` element, closed on initial render and on HTMX partial re-render
- [ ] The `summary` contains the existing heading element (heading hierarchy unchanged)
- [ ] Unit render spec asserts details/summary wrapping and closed default
- [ ] e2e tally assertions open the disclosure first, then assert; keyboard (Enter/Space) opens it
- [ ] `checkA11y` passes at all three widths
- [ ] Screenshot baselines regenerated
- [ ] `npm run verify` passes
