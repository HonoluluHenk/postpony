# 05: Migrate generator e2e to locale tokens and cover the new pickers

**What to build:** The end-to-end test surface for the generator catches up to the localized From/To fields. The generator e2e fills From and To with locale tokens (en-US `MM/dd/yyyy`) instead of ISO strings, and the valid-range assertions still verify generated Proposed Dates fall within the picked window. The date-picker e2e is extended to open both the From and To pickers via their buttons, assert they write locale tokens, and run the accessibility check against an open picker, mirroring the existing Proposed Date picker coverage.

**Blocked by:** 04 (localized From/To fields and pickers in the generator)

**Status:** done

- [x] The generator e2e's valid-range and error-path cases fill From/To as locale tokens (en-US month-first) and pass.
- [x] The date-picker e2e opens each of From and To pickers via its button and asserts locale-token output.
- [x] An open From/To picker passes the accessibility check.
- [x] The full e2e suite is green with the localized fields.