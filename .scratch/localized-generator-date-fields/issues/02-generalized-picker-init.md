# 02: Generalized client-side datepicker initializer

**What to build:** The client-side air-datepicker initialization becomes a reusable initializer so the edit page can drive any number of localized pickers, not just the single Proposed Date one. The current hardcoded picker setup is parameterized by (input element, its calendar button, whether it shows a time picker) and the single live-instance is replaced by a list so each picker can be destroyed and recreated on every HTMX partial swap. The existing Proposed Date field keeps its exact current behavior (time picker, open-on-button-only, tolerant selection of a prefilled token value). This is a pure refactor with no user-visible change yet.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [x] The existing single Proposed Date picker still opens via its button, writes locale tokens, and survives HTMX swaps exactly as before (regression-guarded by the existing browser no-op spec and the date-picker e2e).
- [x] The initializer accepts a date-only mode (no time picker) as a distinct configuration, ready for the From/To fields.
- [x] The client is a no-op when AirDatepicker is absent, preserving the current defensive behavior.

## Comments
- `2d5a229` — generalized `initProposedDateTimePicker` into `initDatePicker(input, button, config)` with `showTime` switch; Proposed Date keeps exact behavior; all boxes ticked.