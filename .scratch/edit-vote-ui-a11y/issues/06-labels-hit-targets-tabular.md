# 06: Vote & edit: label casing, hit targets, tabular count alignment

**What to build:** the small consistency and operability fixes measured by the review. The middle vote choice renders "If necessary" (title-cased, matching "Yes"/"No") while the stored value stays unchanged. Radio and checkbox choices get hit targets that pass the target-size check (control or its wrapped label ≥ the required size) on both the vote page and the edit rail. Vote Summary counts and the edit rail's team tallies are right-aligned with tabular numerals so columns stop jittering as counts change.

**Blocked by:** 05 — Vote page: week grouping with a hoisted venue chip

**Status:** ready-for-agent

- [x] The middle choice displays "If necessary" next to "Yes"/"No" in en and de; the underlying vote value is unchanged so no existing data or domain logic moves.
- [x] Radio/checkbox hit targets on the vote page and the edit rail pass the target-size rule; axe reports no target-size violation on either surface.
- [x] The vote summary counts and the edit team tallies are end-aligned and set to tabular numerals, so equal counts render at equal width.
- [x] A browser-level spec asserts the target geometry and the computed tabular alignment, and the existing axe checks pass on both surfaces.