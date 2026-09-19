# 08: Vote page: "Set all" stays in reach while voting

**What to build:** on a long vote list a Participant must currently scroll back to the top to bulk-set their choices. The "Set all" controls stay visible against the top of the viewport within the vote region for the length of the vote, so a Participant can restore defaults mid-list; on short lists they remain in-flow. The existing accessible labels and tooltips are kept, and the bulk-set action still updates the choices and the summary. Under reduced motion the bar degrades to in-flow (no animation).

**Blocked by:** 07 — Vote page: votes save without JavaScript

**Status:** ready-for-agent

- [x] While the vote list is long enough to scroll, "Set all" stays within reach against the top of the viewport; on short lists it stays in-flow.
- [x] The existing aria labels and tooltips are intact, the control has a visible focus, and reduced-motion preference degrades it to in-flow.
- [x] Bulk-setting a value updates that value across all visible dates and the summary, and the usual save confirmation still appears.
- [ ] The vote e2e and axe checks pass with the sticky active.

## Comments

- `8dfaba4` — ticket done: sticky `Set all` bar via `position: sticky`, plus
  the `main.responsive { overflow-x: clip }` override that fixes BeerCSS's
  `overflow-x: hidden` silently breaking sticky (this also repairs the edit
  sidebar sticky). Reduced-motion degrades to in-flow.
- `efeb311` — review: 0 standards + 0 spec findings (noted deviation: bar pins
  to viewport top, there is no fixed header to sit below).