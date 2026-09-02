# 04: Localized From/To fields and pickers in the generator

**What to build:** The generator's From and To fields become localized date inputs in full parity with the existing Proposed Date field. Each is now a plain text field showing the locale's date tokens (not a native ISO date control), carrying the locale's input mode, `autocomplete="off"`, a placeholder of the token format, and its own explicit calendar button that opens a localized date-only air-datepicker grid (one per field, open-on-button-only, never on focus). New locale strings give each calendar button a distinct accessible name identifying which field it opens, and a shared required-message string is used for the new empty-field validation. The two pickers remain live across HTMX partial swaps.

**Blocked by:** 02 (generalized client-side datepicker initializer), 03 (server locale-token validation, prefill, and required From/To)

**Status:** ready-for-agent

- [x] An organizer sees From and To as text fields showing their locale's date tokens with the token-format placeholder.
- [x] Each field has its own calendar button that opens a localized date-only grid; the grid opens only via that button and never on focus.
- [x] The picker writes locale tokens into the field, which round-trip through the server's locale-aware validation.
- [x] The pickers stay live after an HTMX partial swap of the generator form.
- [x] Each calendar button has a distinct accessible name identifying its field, and the axe checks pass with a picker open.