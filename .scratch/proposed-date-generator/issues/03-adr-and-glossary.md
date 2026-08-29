# 03: ADR + glossary for fixed-grid generator

**What to build:** The decision behind the fixed-grid generator is written down so a future reader doesn't wonder why the grid is locked. A small ADR records the fixed Monday–Sunday grid with locked weekdays, no add/remove rows, and fill-to-generate semantics, plus the alternatives considered and rejected (free-form rows with client-side row management, pre-filled default times) and the reasons. A matching glossary entry is added for the generate interaction, using the domain vocabulary (Match anchor, planning window, Proposed Date) and free of implementation detail.

**Blocked by:** 01 (fixed weekday grid + time-only submit)

**Status:** done

- [x] ADR added: fixed weekday grid decision, the rejected alternatives (free-form rows, client-side row management, pre-filled times), and why the grid won; follows the repo's ADR format and numbering.
- [x] Glossary entry added for the generate interaction in the domain glossary, consistent with existing terms and free of implementation details.
