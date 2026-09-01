# 02: Generator rows get 15-minute time-only pickers

**What to build:** Each of the seven weekday rows of the Proposed Dates Generator gets its own time-only picker offering 15-minute increments. It opens only via an explicit per-row button (never on focus), so an Organizer can still type a custom time. Picking a time writes the locale's token format into that row's field. Off-grid typed values (e.g. an echoed `19:37`) are left untouched. The page handles several picker instances at once and re-creates them after HTMX partial swaps, and the per-row buttons carry localized, accessible names.

**Blocked by:** 01 — Single Proposed Date picker steps in 15-minute increments (same picker-init module; serializes the two edits).

**Status:** ready-for-agent

- [x] Each of the seven weekday rows shows a picker trigger button with a localized accessible name (`en` and `de`; `fr`/`it` reuse English).
- [x] Clicking a row's button opens a time-only picker (no date view) whose minute slider steps in 15-minute increments and hour slider in 1-hour steps.
- [x] Picking a time writes the locale time token (`HH:mm` or `hh:mm aa`) into that row's input, matching its placeholder.
- [x] Row inputs stay plain text: the picker never opens on focus, and typed off-grid values are never rewritten.
- [x] Multiple pickers coexist on the page; after an HTMX partial swap no stale instance survives and every re-rendered input gets a live picker.
- [x] Buttons and picker time sliders are labelled and keyboard-operable; the a11y scan on the generator section passes.
- [x] Browser unit test records `onlyTimepicker: true`, `minutesStep: 15`, and never-on-focus behaviour for the row pickers via a recording `AirDatepicker` fake, and verifies each button opens its picker.
- [x] E2E covers the generator rows pickers (button, stepping, written value) and confirms the main picker is not regressed.

## Comments

- Implementation: `151db03`
- Review: `386a4aa`

Each generator weekday row gains a time-only picker (`timepicker + onlyTimepicker`, `minutesStep: 15`, hour step at vendor default 1) opened only via a per-row localized button; picking writes the locale time token into the row input, leaving typed off-grid values untouched. The single-instance picker lifecycle was generalised to a per-input registry (`pickerInstances` Map) that prunes detached instances and re-mounts on every HTMX swap. A headless-browser calibration during implementation uncovered that the vendored bundle only builds the time sliders when `timepicker: true` is set alongside `onlyTimepicker` — both are now passed and locked in by the unit test. Browser unit tests assert the option wiring, per-button open, and swap/rebind; two new e2e tests cover the row pickers and confirm the main picker is unregressed (13 e2e green). Full gate green in the worktree: lint ✓, 578 tests ✓ (coverage 89/81/92/89), e2e ✓.