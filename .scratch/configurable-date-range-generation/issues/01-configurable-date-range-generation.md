# Configurable date range for proposed date generation

Status: ready-for-agent

## Description

Replace the hardcoded backward/forward week offsets in the proposed date generator with user-provided `from` and `to` date fields on the generator form.

See `spec.md` for full details.

## Acceptance Criteria

1. Generator form has `from` and `to` date fields above the weekday grid.
2. Server validates `from >= today`, `to > from`, `to <= originalMatchDateTime + 4 weeks` (or `today + 4 weeks` if no anchor).
3. `MAX_FORWARD_WEEKS_FROM_ORIGINAL = 4` is exported from `proposed-dates-generator.ts`.
4. When no anchor exists, form defaults to `from = today`, `to = today + 4 weeks`.
5. Generate button is always enabled; validation errors render as field-level messages.
6. All existing generator tests pass with updated `fromIso`/`toIso` interface.
7. New tests cover validation edge cases (past `from`, inverted range, cap exceeded, no-anchor defaults).
8. `usedFallbackWindow` field removed from `GenerateProposedDatesResult`.
9. Localization keys added to `en.json` and `de.json`.

## Blocking edges

None.

## Comments
