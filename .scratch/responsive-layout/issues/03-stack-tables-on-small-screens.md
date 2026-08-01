# 03 — Stack tables on small screens

**What to build:** Below 993px the vote-tally tables and the scrape-wizard meetings table reflow into labeled cards instead of overflowing, so every cell (including the Yes/Maybe/No tallies and the meeting actions) stays readable without horizontal scrolling. The reflow is CSS-only: the table keeps its real semantics in the accessibility tree, and each stacked cell prints its column header label above its value.

**Blocked by:** 01 — Widen the layout to 1200px

**Status:** ready-for-agent

- [ ] Below 993px, tables render with the header row visually hidden and rows/cells as block-level cards
- [ ] Each stacked cell shows its column label above its value, driven by a data-label attribute
- [ ] data-label attributes are present on every cell of the vote-tally table (covers the edit page, its partial swap, and the join vote page) and the scrape meetings table, using the already-translated header strings including the Actions column
- [ ] At 993px and wider, tables render as normal tables — no change
- [ ] A focused e2e check verifies the vote-tally table stacks below 993px (cells block-level, header row hidden)
- [ ] `npm run lint`, `npm run test`, `npm run e2e` pass

## Comments

- Spec: `.scratch/responsive-layout/spec.md`, "Tables stack below 993px" and "data-label attributes" decisions.
