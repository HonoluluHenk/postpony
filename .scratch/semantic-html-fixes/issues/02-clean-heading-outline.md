# 02 — Clean heading outline on the owner edit page

**What to build:** The "Home team" and "Away team" labels on the owner edit page drop from `h5` to `h4`, so the outline reads `h1` (layout) → `h2` (scheduling info) → `h3` (management sections) → `h4` (teams) with no skipped level.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] The outline has no skipped heading levels on the edit page (`h3` → `h4`, not `h3` → `h5`).
- [ ] Heading text is unchanged; only the levels change.
- [ ] The axe `heading-order` rule passes on the edit page.
- [ ] Existing heading-based e2e assertions (level-3 tallies, level-1 layout) still pass.
