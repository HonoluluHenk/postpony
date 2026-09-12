# 06: Vote tables show their title once and align numbers

**What to build:** The Own Team Votes, Home Team Votes, and Away Team Votes tables show their title a single time visually (the heading), while the table keeps an accessible name. Vote counts and the "voted" column use tabular numerals and are right-aligned so columns can be compared at a glance.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] Table `<caption>` is visually hidden in all three tables; the heading remains the visible title and stays the first child of its section
- [x] `getByRole('table', { name })` still resolves for each table (accessible name preserved)
- [x] Yes/Maybe/No cells and the voted-count cells (header and body) carry a shared numeric class styled with `font-variant-numeric: tabular-nums` and `text-align: end`
- [x] Mobile stacked-table styles (data-label cards) still render correctly with the new class
- [x] Player header cells in the own-team table have a stable `key`
- [x] Component specs assert hidden caption class and numeric class placement; join-voting e2e still passes
