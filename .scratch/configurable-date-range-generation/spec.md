## Problem Statement

The date range used when generating proposed dates is fixed to hardcoded constants (8 weeks before the original match date, 4 weeks after). Organizers cannot customize the window — e.g., a match in 3 months shouldn't generate dates starting 8 weeks before, and a match next week shouldn't be capped at 4 weeks after if the hall isn't available for 6 weeks.

## Solution

Replace the hardcoded backward/forward week offsets with user-provided `from` and `to` date fields on the generator form. The server validates the constraints (`from >= today`, `to <= originalMatchDateTime + 4 weeks`, `to > from`) and uses `[from, to]` directly as the planning window instead of computing it from the anchor ± offsets.

## User Stories

1. As an organizer, I want to specify a `from` date on the generator form, so that generated proposed dates start no earlier than that date.
2. As an organizer, I want to specify a `to` date on the generator form, so that generated proposed dates end no later than that date.
3. As an organizer, I want validation feedback when my `from` date is before today, so that I know I must pick today or later.
4. As an organizer, I want validation feedback when my `to` date exceeds 4 weeks after the original match date, so that I know there's a hard cap.
5. As an organizer, I want validation feedback when my `to` date is not after my `from` date, so that I know the range is invalid.
6. As an organizer without an original match date set, I want the generator to use sensible defaults (today for `from`, today + 4 weeks for `to`) so that I can still generate dates.
7. As an organizer, I want the Generate button to remain enabled even when the original match date is not set, so that I can generate using the default window.
8. As an organizer, I want to see a tooltip on the `from`/`to` fields when validation fails, so that I understand which constraint was violated.
9. As a developer, I want the 4-week cap to be an exported public constant, so that tests and other consumers can reference the single source of truth.
10. As an organizer, I want the existing dedupe and past-candidate filtering to continue working with the new window, so that duplicate or past dates are never generated.
11. As an organizer, I want all existing generator behavior (weekday grid, tuple parsing, clash detection, auto-deselect) to remain unchanged, so that this is a pure window-change and not a behavior regression.

## Implementation Decisions

### Module: `proposed-dates-generator.ts`

- **Rename constants**: Replace `BACKWARD_WEEKS` (deleted) and `FORWARD_WEEKS` with a single exported constant:
  ```typescript
  export const MAX_FORWARD_WEEKS_FROM_ORIGINAL = 4;
  ```
- **Change `GenerateProposedDatesInput` interface**:
  - Remove `anchorIso` field.
  - Add `fromIso: string` and `toIso: string` fields (both required, ISO strings at minute precision).
  - Remove `usedFallbackWindow` from `GenerateProposedDatesResult` — no longer meaningful when window is explicit.
- **Change window computation**: The generator no longer computes a window from anchor ± offsets. It uses `[fromIso, toIso]` directly. The `lower` bound becomes `max(today, fromIso)` (so past dates are still excluded inside the generator), and `upper` becomes `toIso`.
- **Past filtering remains**: The generator still filters candidates `<= today` (strict greater-than), so even if `from < today`, the output only contains future dates.

### Module: `proposed-dates-post.ts` (handler)

- **Add new form fields**: `fromDate` and `toDate` submitted alongside the existing `time[]` array and `generate=tuple` discriminator.
- **Add a new Valibot schema** for the range fields:
  - `fromDate`: string, parsed via `parseLocaleDateTime` (or a date-only variant), validated `>= today`.
  - `toDate`: string, parsed similarly, validated `> fromDate` and `<= originalMatchDateTime + MAX_FORWARD_WEEKS_FROM_ORIGINAL`.
  - When `originalMatchDateTime` is absent, the `to` cap uses `today + MAX_FORWARD_WEEKS_FROM_ORIGINAL`.
- **Defaults**: When `originalMatchDateTime` is absent, pre-fill defaults: `from = today`, `to = today + MAX_FORWARD_WEEKS_FROM_ORIGINAL`. These are server-rendered into the form values so the user sees them.
- **Validation errors**: Rendered inline as field-level errors via `generatorFromError` / `generatorToError` in the partial response (HTMX outerHTML swap into `#proposed-dates-management`).
- **Pass to generator**: After validation passes, call `generateProposedDates({fromIso, toIso, todayIso, tuples, existingStarts})`.

### Module: `proposed-dates-section.tsx` (view)

- **Add two new date inputs** to the `GenerateForm` component, placed above the weekday grid:
  - A `from` date field (`name="fromDate"`) with `type="date"` or `type="text"` using locale format.
  - A `to` date field (`name="toDate"`) with the same format.
  - Each field has its own error span rendered when validation fails.
- **Defaults in HTML**: When no anchor exists, the `value` attributes of both fields are pre-filled with the server-computed defaults (`today`, `today + 4w`).
- **Preserve submitted values**: On validation failure, re-render the form with the user's submitted values (echo-back pattern, like existing `times[]` behavior).
- **No new props on `ProposedDatesSection`**: Only `GenerateFormProps` and the partial render extras gain `fromDate`/`toDate`/error fields.

### Localization

- **New keys** needed in `en.json` and `de.json`:
  - `proposed_dates_generate_from_label` — "From"
  - `proposed_dates_generate_to_label` — "To"
  - `proposed_dates_generate_from_invalid` — "Date must be today or later"
  - `proposed_dates_generate_to_invalid` — "Date must be after 'From' and at most 4 weeks after the original match"
  - `proposed_dates_generate_to_invalid_no_anchor` — "Date must be after 'From' and at most 4 weeks from today"

### Seams for testing

- **Primary seam (highest)**: The `generateProposedDates()` function itself — pure function, already tested via `proposed-dates-generator.spec.ts`. Change the input/output interface, update tests.
- **Secondary seam**: The `handleTupleSubmit()` handler — tested via integration with the existing e2e or handler-level tests. Add validation test cases for the new `from`/`to` fields.
- **No new seams needed**. The existing generator spec file is the primary test surface. The handler already has a validation pattern we extend.

## Testing Decisions

### Unit tests (`proposed-dates-generator.spec.ts`)

- Update all existing tests to use `fromIso`/`toIso` instead of `anchorIso`.
- Add tests for:
  - `from < today` → generator still filters past candidates (uses `max(today, from)` internally).
  - `to <= from` → empty result (window is inverted).
  - `from` and `to` on the same day with a matching tuple time → one result if time > today's current time, zero otherwise.
  - Window boundaries are inclusive for `to` (a candidate exactly at `to` is included).
  - Default window `[today, today + 4w]` behavior is preserved when caller passes those values.
- Remove tests for `usedFallbackWindow` (field deleted from result).

### Handler-level / E2E tests

- Test validation:
  - `from` before today → error message rendered, no dates added.
  - `to` before or equal to `from` → error, no dates added.
  - `to` beyond `originalMatchDateTime + 4w` → error, no dates added.
  - No anchor + `to` beyond `today + 4w` → error, no dates added.
  - Valid `from`/`to` with no anchor → generates within `[today, today + 4w]`.
  - Valid `from`/`to` with anchor → generates within `[from, to]` respecting the cap.
- Test defaults: when no anchor, the form pre-fills `from=today`, `to=today+4w`, and Generate works with those defaults.

### Prior art

- Existing `proposed-dates-generator.spec.ts` follows the pure-module convention (ISO strings in/out, no Hono context).
- E2E tests for the edit page (`e2e-tests/pages/EditPage.ts`) already exercise the generator form submission; extend with new field interactions.

## Out of Scope

- Changing the weekday grid UI (7 rows, Monday–Sunday) — this remains unchanged.
- Adding a date picker widget for the `from`/`to` fields — native browser `<input type="date">` or the existing text-input-with-locale-parse pattern is sufficient.
- Persisting custom `from`/`to` values as session state — each generation submission is stateless; the form values are not saved between submissions.
- Changing the dedupe logic, clash detection, or auto-deselect behavior — these remain exactly as-is.
- Allowing `from` to be in the past — server enforces `from >= today`.
- Allowing `to` to exceed 4 weeks after the original match date — hard cap enforced server-side.

## Further Notes

- The `from >= today` constraint means the user can enter today as the earliest date (Q3 grilling decision: "today" is allowed, not strictly "tomorrow").
- The 4-week cap is `MAX_FORWARD_WEEKS_FROM_ORIGINAL = 4`, exported from `proposed-dates-generator.ts`. This is the single source of truth.
- When no anchor exists, the `to` cap is computed relative to `today` (not "unbounded"). This keeps the fallback window identical to the current behavior.
- The `usedFallbackWindow` result field is removed since the window is now always explicit. The "no anchor" toast message (if desired) can be determined in the handler by checking whether `session.originalMatchDateTime` is undefined.
