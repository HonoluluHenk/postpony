# Spec: 15-Minute Time Picker for Proposed Dates

Status: ready-for-agent

## Problem Statement

The Proposed Date picker lets an Organizer choose any minute value (00–59), producing awkward off-grid meeting times. The Proposed Dates Generator's weekday time rows have no picker at all and must be typed by hand. The user wants all offered times to move in 15-minute increments.

## Solution

The air-datepicker enhancement on the Proposed Date picker steps minutes by 15. Each Proposed Dates Generator weekday row gains its own time-only picker, also stepping in 15-minute increments. Free-text entry and server-side parsing stay untouched — the constraint is enforced only inside the picker widgets.

## User Stories

1. As an Organizer, I want the Proposed Date time picker to offer only 15-minute-aligned times, so that proposed meeting times are plausible quarter-hour slots.
2. As an Organizer, I want the minute slider of the Proposed Date picker to jump in steps of 15 (0 / 15 / 30 / 45), so that I cannot select an off-grid minute by accident.
3. As an Organizer, I want the hour slider to keep its 1-hour steps, so that picking an hour stays fast.
4. As an Organizer, I want each weekday row of the Proposed Dates Generator to have a time-only picker, so that I can pick a start time without typing the format from memory.
5. As an Organizer, I want each generator row's time-only picker to step in 15-minute increments, so that the same alignment rule holds on both entry paths.
6. As an Organizer, I want a generator row's picker to open only via its explicit button and never on focus, so that I can still type a custom time into the row.
7. As an Organizer, I want to keep a typed off-grid time (e.g. an echoed `19:37`) untouched, so that the free-text field stays tolerant and nothing I type is silently mutated.
8. As an Organizer, I want the pickers to write the locale's token format (`HH:mm` or `hh:mm aa`) matching the field placeholder, so that the submitted value stays parseable by the server.
9. As a screen-reader user, I want accessible names on the per-row picker buttons and on the picker time sliders, so that the picker is operable non-visually.
10. As a keyboard user, I want the per-row picker buttons reachable and operable via the keyboard, so that I don't need a pointing device.
11. As an Organizer, I want the pickers to keep working after an HTMX partial swap (an error echo or a re-rendered date list), so that a validation error does not leave me with a dead picker.
12. As an Organizer in an English/German interface, I want the new picker button labels in my locale, so that the interface stays consistent.

## Implementation Decisions

- The single Proposed Date picker instance gains a `minutesStep: 15` option; `hoursStep` stays 1. No other change to its options or trigger.
- Each of the seven Proposed Dates Generator rows mounts a time-only air-datepicker instance (`onlyTimepicker: true`, `minutesStep: 15`, `timeFormat` from the active locale). The row keeps its existing plain text input and server grammar; the picker is pure progressive enhancement.
- Row pickers open only via an explicit per-row button (mirroring the single picker's calendar-button pattern). They never open on focus, preserving free typing.
- Off-grid values are never rounded, snapped, or rewritten: the picker leaves the field as-is until the Organizer actively picks a new time.
- The page now hosts up to eight picker instances (one full, seven time-only). Their lifecycle (tracking, destroy on swap, recreate on `htmx:afterSettle`) must be generalized from the current single-instance handling so no stale instance survives a swap and no input is bound twice.
- The existing slider aria-label patch is reused for every time-only picker, using the active locale's hours/minutes labels.
- A new localization key provides the per-row button's accessible name in `en` and `de`; `fr`/`it` reuse the English text per ADR-0016.

## Testing Decisions

- A good test asserts external behavior: the picker steps in 15-minute increments, opens only via its button, writes the picked time in the locale format, still works after an HTMX swap, and is accessible. It does not assert DOM/implementation detail beyond the option wiring that encodes the rule.
- E2E (Playwright): extend the existing date-picker and Proposed Dates Generator e2e suites to assert 15-minute stepping on the main picker's minute slider, per-row buttons opening time-only pickers, written values, and a11y scans. Prior art: `date-picker.e2e.ts`, `proposed-date-generator.e2e.ts`.
- Browser unit (Vitest, headless Chromium): exercise the picker wiring through a recording `AirDatepicker` fake instead of loading the vendored bundle — assert `minutesStep: 15` on the single picker, and `onlyTimepicker: true` + `minutesStep: 15` + never-on-focus for the row pickers, and that each button opens its picker. Prior art: the vendor-init no-op tests in `ui.spec.js`.
- Server side is intentionally unchanged: existing parsing/validation tests for `parseLocaleDateTime` / `parseLocaleTimeOnly` and the edit handlers must stay green as a no-harm guard, with no new server-side validation.

## Out of Scope

- Server-side rejection or rounding of off-grid times (the server stays tolerant by design).
- Rounding/snapping of typed free-text values.
- Switching the inputs to native `type="time"` or HTML5 step validation.
- Changing the locked Monday–Sunday grid or the locale time formats.

## Further Notes

- Real click-tt start times seen in fixtures are quarter-aligned (e.g. `16:00`), so 15-minute steps do not exclude realistic proposals.
- The vendored air-datepicker supports `onlyTimepicker` and `minutesStep`, and its default `minutesStep` is 1, so the step currently offered is not what the product wants.
- Time-only pickers have no date view; on pick they write only the time token into the row field.