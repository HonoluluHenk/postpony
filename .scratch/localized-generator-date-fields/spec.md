# Spec: Localized From/To Date Fields in the Proposed Dates Generator

Status: ready-for-agent

## Problem Statement

On the edit page, the Proposed Dates Generator lets the organizer bound the planning window with a "From" and a "To" date. These two fields are the only date inputs on the page still using the native `<input type="date">`. That control always renders an ISO YYYY-MM-DD day grid no matter the locale — so a de-CH organizer (who reads dates day-first as `dd.MM.yyyy`) and an en-US organizer (month-first, `MM/dd/yyyy`) both get the same non-localized field. The rest of the edit page already speaks the organizer's locale (the single Proposed Date field shows locale tokens and opens a localized air-datepicker calendar, per ADR-0016). The generator's from/to fields are the leftover inconsistency.

The planned result: from/to stop being an ISO text field and become localized, matching the established locale-aware date-input pattern.

## Solution

The generator's From and To fields become localized date inputs in full parity with the existing Proposed Date field (ADR-0016): each is a plain text field showing the locale's date tokens (e.g. `dd.MM.yyyy` or `MM/dd/yyyy`), with a `lang` attribute, `autocomplete="off"`, a placeholder showing the expected token format, and an explicit calendar button that opens a localized air-datepicker calendar (day grid only, no time picker). The calendar opens only via its button, never on focus. The two fields get separate pickers (one per field, not a range picker). The server owns parsing: it parses the locale date tokens back to ISO with a new date-only parser, symmetric with the existing `parseLocaleTimeOnly`, and no longer accepts bare `YYYY-MM-DD`. An empty From or To is now rejected with a clear message instead of silently defaulting.

## User Stories

1. As an organizer choosing the planner window on the edit page, I want the From field to show the date in my locale's tokens, so that I can read and edit it the way I read dates.
2. As an organizer choosing the planner window on the edit page, I want the To field to show the date in my locale's tokens, so that I can read and edit it the way I read dates.
3. As a de-CH organizer, I want the From/To calendar grid and typed values to be day-first (`dd.MM.yyyy`), so that the date order matches what I expect.
4. As an en-US organizer, I want the From/To calendar grid and typed values to be month-first (`MM/dd/yyyy`), so that the date order matches what I expect.
5. As an organizer, I want to open a localized calendar for From (and separately for To) with an explicit button, so that I can pick a date instead of typing it.
6. As an organizer, I want the From and To calendars to be separate pickers, so that each bounds its own side of the window without a multi-step range interaction.
7. As an organizer, I want to be able to type a date directly into From or To using my locale's tokens, so that the field stays a free-form input and keyboard entry works.
8. As an organizer, I want the field's placeholder to show my locale's token format, so that I know what shape to type.
9. As an organizer submitting with an empty From or To, I want a clear "please enter a date" message, so that I know the field is required rather than silently getting a default.
10. As an organizer submitting with an empty, whichever of From/To is empty is flagged on that field, so that the error is tied to the offending input.
11. As an organizer, I want the From/To fields to keep working across HTMX partial swaps (the generator re-renders on submit), so that the pickers are alive after each validation round-trip.
12. As an organizer, I want the pickers to open only on their explicit calendar button, never on focus, so that typing is not interrupted by a popping calendar.
13. As a keyboard or screen-reader user, I want the From and To calendar buttons to have distinct accessible names identifying which field they open, so that I know what each opens.
14. As a screen-reader user, I want the From/To text fields to carry the locale-appropriate input mode and token placeholder, so that assistive tech reads them consistently with the rest of the edit page.
15. As an organizer, I want the same validation rules to still apply after the change (From must be today or later; To must be after From and within the window cap), so that the planner window semantics are unchanged.
16. As an organizer, I want the generated Proposed Dates to still fall within the chosen From/To window, so that the localized fields do not change generator behavior.
17. As an organizer re-opening or re-generating, I want the From/To prefill to render in locale tokens too, so that the initial values read correctly in my language.

## Implementation Decisions

### Locale-token text fields, not native date inputs

- The generator's `#fromDate` / `#toDate` inputs change from `<input type="date">` to plain text fields showing the locale's **date tokens** (`localeConfig(locale).dateFormat`: `dd.MM.yyyy` for the CH locales, `MM/dd/yyyy` for en-US). They carry `lang={locale}`, `autocomplete="off"`, and a placeholder of the token format. ISO `value` strings are no longer placed directly into these fields — they are formatted to locale tokens first.
- This is a date-only application of the accepted ADR-0016 pattern (the field is a carrier; the server owns parsing; the picker is a convenience). No new ADR is warranted — it is bringing the from/to fields into compliance with an existing decision. ADR-0015's native-control path is already superseded by ADR-0016 and does not apply.

### Two independent pickers, one per field

- From and To each get their own air-datepicker instance bound to a separate explicit calendar button (one button per field). No range mode — the fields stay independent. The picker config is date-only (`timepicker: false`), shows the locale's month/day vocabulary (existing vendored `air-datepicker-locales.js` already carries `dateFormat` and month/day names per locale), and opens only via its button (`showEvent` never auto-fires on focus), mirroring the existing Proposed Date picker.

### Client-side picker initialization

- The hardcoded `initProposedDateTimePicker` is generalized into a reusable initializer, parameterized by the input element, its calendar button, and whether a time picker is shown. It is invoked for the Proposed Date field (with time picker, unchanged behavior) and for each of the two date-only From/To fields.
- The single `activeDatePicker` singleton becomes a list of live instances. All are destroyed and recreated on every HTMX `afterSettle` swap of the generator form so a fresh input always gets a live picker, preserving the existing destroy-on-swap lifecycle for the datetime field.
- Reading a prefilled token value into the picker's `selectedDates` reuses the existing tolerant retry-on-parse-failure approach. No ARIA slider patching is needed for the date-only pickers (there are no time sliders).

### New date-only parser and formatter

- Add `parseLocaleDateOnly(value, locale)` to the temporal utilities module, symmetric with the existing `parseLocaleTimeOnly`:
    - Tolerant separators `.`, `/`, `-`; day-first vs month-first decided by the locale's `dayFirst` flag.
    - Strict ISO round-trip so impossible dates (`2026-02-30`) are rejected.
    - Returns `undefined` on failure instead of throwing.
- Add a matching date-only formatter that renders an ISO date into the locale's date tokens (mirrors `formatIsoToLocaleTokens` minus the time part), used for From/To prefill.

### Server schema validation

- The generator's tuple schema validates From/To with the new locale-aware `parseLocaleDateOnly` instead of the strict `YYYY-MM-DD` date regex. The submission is parsed under the rendering locale (`app.locale`), which is the locale that rendered the fields — the happy path is deterministic per ADR-0016.
- **Empty From or To is now a validation error**, surfaced on the offending field, instead of the current silent `?? today / today+4w` fallback. The fallback defaulting in the handler is removed; prefill is supplied by the get route.

### Prefill in locale tokens

- The get route's From/To defaults (today for From; today+4w, or the original Match date + 4 weeks when an anchor exists, for To) are formatted to locale date tokens before rendering, instead of being injected as ISO. After a validation-error re-render the echoed values are the raw submitted tokens.

### Localization

- New shared required-message key `proposed_dates_generate_date_required` ("Please enter a date"), shown for an empty From or To, distinct from the existing range-violation keys (`from_invalid`, `to_invalid`, `to_invalid_no_anchor`). Added to both en.json and de.json; fr-CH/it-CH mirror English per ADR-0016.
- New field-specific calendar-button labels, e.g. "Open calendar for the From date" / "Open calendar for the To date", identifying which field each button opens. Added to en.json and de.json; fr-CH/it-CH mirror English. (The datetime field keeps its existing single "Open calendar" label.)

## Testing Decisions

Good tests assert external behavior only: the locale tokens a user sees and types, which calendar opens, and the parser's acceptance/rejection of token strings and impossible dates — not internal implementation details of the picker wiring.

- **Unit — temporal utilities** (`temporal-utils.spec.ts`, existing seam): test `parseLocaleDateOnly` across the four locales (day-first vs month-first), tolerant separators, impossible-date rejection, and empty input; test the date-only formatter round-tripping ISO to each locale's tokens. Prior art: the existing `parseLocaleTimeOnly` describe block.
- **Handler — generator submit** (`edit-handlers.spec.ts`, via `handleEditProposedDatesPost`): From/To posts now use en-US token strings (e.g. `08/26/2026`) instead of ISO (e.g. `2026-08-26`); new cases asserting an empty From and an empty To surface the required message on the correct field and add no Proposed Dates. Prior art: the existing tuple-branch handler tests.
- **Browser — client init** (`ui.spec.js`, browser project): the generalized picker initializer is a no-op when AirDatepicker is absent (mirroring the existing no-op spec), and it wires both date-only fields plus the datetime field. Prior art: the existing `initProposedDateTimePicker` no-op spec.
- **End-to-end**:
    - `date-picker.e2e.ts` (existing seam): extend to open the From and To pickers via their buttons, assert they write locale tokens (`MM/dd/yyyy` en-US), and run the a11y check against them — mirroring the existing Proposed Date picker e2e.
    - `proposed-date-generator.e2e.ts` + `EditPage` page object: `fillFromDate`/`fillToDate` fill locale tokens (en-US `MM/dd/yyyy`) instead of ISO; the valid-range and error-path assertions are updated to token strings; the valid-range test still asserts generated Proposed Dates fall within the picked window.

## Out of Scope

- The single Proposed Date field's picker behavior (it keeps working unchanged — only the initializer is refactored beneath it; no behavior change to the datetime field).
- A date-range picker spanning both fields (explicitly declined in design; the fields stay independent).
- Day/month-ambiguity guards beyond what ADR-0016 already accepts (a pasted date from a differently-localized session may flip day/month; out of scope, already accepted).
- Making the venue dropdown or any other part of the generator form localized.
- A new ADR for this change (the locale-token date-input pattern is already decided by ADR-0016).

## Further Notes

- Removing the native `<input type="date">` drops the native mobile date control for these two fields; all devices now get the vendored air-datepicker. This mirrors what ADR-0016 already did to the datetime field (the coarse-pointer guard was removed there), so it is an accepted, consistent trade-off rather than a regression.
- The domain concept is unchanged: the Proposed Dates Generator still proposes a weekly slate inside the From/To planning window (see CONTEXT.md "Proposed Dates Generator"). No glossary change; only the UI mechanism for entering From/To is localized. No `Postponement` model or persistence change.
