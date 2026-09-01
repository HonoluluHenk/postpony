# 02: Generator rows get 15-minute time-only pickers

**What to build:** Each of the seven weekday rows of the Proposed Dates Generator gets its own time-only picker offering 15-minute increments. It opens only via an explicit per-row button (never on focus), so an Organizer can still type a custom time. Picking a time writes the locale's token format into that row's field. Off-grid typed values (e.g. an echoed `19:37`) are left untouched. The page handles several picker instances at once and re-creates them after HTMX partial swaps, and the per-row buttons carry localized, accessible names.

**Blocked by:** 01 — Single Proposed Date picker steps in 15-minute increments (same picker-init module; serializes the two edits).

**Status:** ready-for-agent

- [ ] Each of the seven weekday rows shows a picker trigger button with a localized accessible name (`en` and `de`; `fr`/`it` reuse English).
- [ ] Clicking a row's button opens a time-only picker (no date view) whose minute slider steps in 15-minute increments and hour slider in 1-hour steps.
- [ ] Picking a time writes the locale time token (`HH:mm` or `hh:mm aa`) into that row's input, matching its placeholder.
- [ ] Row inputs stay plain text: the picker never opens on focus, and typed off-grid values are never rewritten.
- [ ] Multiple pickers coexist on the page; after an HTMX partial swap no stale instance survives and every re-rendered input gets a live picker.
- [ ] Buttons and picker time sliders are labelled and keyboard-operable; the a11y scan on the generator section passes.
- [ ] Browser unit test records `onlyTimepicker: true`, `minutesStep: 15`, and never-on-focus behaviour for the row pickers via a recording `AirDatepicker` fake, and verifies each button opens its picker.
- [ ] E2E covers the generator rows pickers (button, stepping, written value) and confirms the main picker is not regressed.