# 02: Make the confirm-clash warning more noticeable

**What to build:** The warning shown when the organizer confirms a Proposed Date that has a Clash ("A scheduled game clashes with this date.") stays in place — it is the safety net for the manual override (the organizer re-enables a deselected date and then confirms it) — but is restyled so it stands out more: higher visual weight and persistent rather than a one-shot toast. The change is purely presentational; the warning's content, when it appears, and its role/announcement semantics are unchanged.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [x] Confirming a Proposed Date with a Clash still renders the clash warning after this change.
- [x] The confirm-clash warning is styled more noticeably than before (higher visual weight, persistent, not a one-shot toast).
- [x] The warning keeps its existing accessibility semantics (role/announcement) that a test asserts.
- [x] A view-level test covers the updated rendering of the confirm-clash warning.
- [x] A clean confirm (no clash) still renders no warning.
