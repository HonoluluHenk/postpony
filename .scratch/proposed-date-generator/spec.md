Status: ready-for-agent

# Spec — Generator: fixed weekday grid, fill-to-generate

Supersedes the earlier generator spec (free-form add/remove rows). The pure generator module, locale time helper, tuple POST branch and page object from that round are implemented and committed; only the row model and its handler/UI plumbing change here.

## Problem Statement

As a Postponement organizer, I want to propose a weekly slate of candidate re-match slots in one step. The current generator asks me to build the slate row by row: add a row, pick a weekday, type a time, repeat. For the common case — one candidate time per day across the week — that row management is overhead, and a free-form row count invites slates that drift from my weekly rhythm. I want a fixed grid: every weekday Monday through Sunday is already there, I fill the times I want, and the empty days are simply skipped.

## Solution

The "Generate Proposed Dates" block renders **one fixed row per weekday, Monday through Sunday** (7 rows). Each row is a static weekday label plus a time input that starts **empty**. The organizer fills the time on the days they want proposed and clicks **Generate**. Only rows with a filled time participate in generation; empty rows are skipped. Rows cannot be added, removed, or re-assigned to a different weekday. The weekday order is the preset; the organizer's input is only the time per day.

Generation stays server-driven: clicking Generate POSTs the filled times, the server generates the matching Proposed Dates inside the planning window (anchored on the Match's `originalMatchDateTime`, bounded 8 weeks back / 4 weeks forward, past dates dropped), and swaps the section. The submitted times round-trip through the response so they survive both error and success re-renders.

## User Stories

1. As a Postponement organizer, I want the generator to show one row per weekday Monday through Sunday, so that every day of the week is available without any setup.
2. As a Postponement organizer, I want the weekday of each row to be fixed and non-editable, so that I cannot accidentally mislabel a day.
3. As a Postponement organizer, I want no add-row / remove-row controls, so that the grid can't grow out of sync with the week.
4. As a Postponement organizer, I want every time input to start empty, so that I deliberately choose which days to propose.
5. As a Postponement organizer, I want to fill only the days I care about and leave the rest blank, so that I don't have to delete default rows.
6. As a Postponement organizer, I want empty-time rows to be ignored by generation, so that blank days produce no dates.
7. As a Postponement organizer, I want a message and no writes when I submit with every row empty, so that I know nothing happened instead of guessing.
8. As a Postponement organizer, I want a row with an invalid (non-empty, unparseable) time to fail that row only — with the error shown under the offending input and all other rows preserved — so that I can correct one value without re-entering the rest.
9. As a Postponement organizer in `de-CH`, I want to type times in `HH:mm`, so that entry matches my locale (ADR-0016).
10. As a Postponement organizer in `en-US`, I want to type times in `hh:mm aa`, so that entry matches my locale (ADR-0016).
11. As a Postponement organizer, I want a confirmation count ("N dates added") after a successful generate, so that I know how many rows landed.
12. As a Postponement organizer, I want generation to skip dates already proposed (idempotent, silently), so that re-submitting doesn't create duplicates.
13. As a Postponement organizer, I want the generator to never produce a date in the past, so that voters never see obsolete options.
14. As a Postponement organizer, I want my submitted times to remain in the form after a successful generate, so that I can tweak and re-submit without retyping.
15. As a Postponement organizer, I want the generated Proposed Dates to appear in the same list with the same votable-by-opponent / removal controls as hand-added ones, so that voting stays one consistent flow.
16. As a Postponement organizer whose `originalMatchDateTime` is missing, I want the planner to fall back to `[today, today + 4 weeks]` and surface a warning, so that generation still works for edge-case Postponements.
17. As a Postponement organizer, I want the Generate block to disappear once the Postponement is `Confirmed`, so that the affordances match the lifecycle state.
18. As a screen-reader user, I want each weekday row labelled and its time input associated with that label, so that I can drive the grid without a pointer.
19. As a developer, I want the generator logic to remain a pure function over the existing `ProposedDate` model, so that corner-case math stays unit-testable without a Hono context.
20. As a developer, I want the tuple POST branch to live in the same handler as the existing single-date POST, so that there is only one route and one owner-auth thread.
21. As a developer, I want the fixed-grid generator to need no client-side JavaScript, so that the row model stays server-rendered and testable.

## Implementation Decisions

### Fixed weekday grid (UI)

- The generator form renders exactly 7 rows. Row `i` (0-based) carries weekday `i+1` in ISO/Temporal convention (1=Monday .. 7=Sunday), shown as the locale's short weekday label from the existing weekday-label mapping. The label is static text, not a `<select>`.
- Each row has one time text input, rendered **empty** (no pre-filled value). Placeholder, `lang` and parse grammar match the existing single-date field (ADR-0016): `HH:mm` for 24h locales, `hh:mm aa` for `en-US`.
- No add-row / remove-row buttons, no row-count state. `MAX_TUPLES` (14) remains the server-side cap as a security guard; the fixed 7-row form can never reach it, so it is no longer exercised by the UI.
- The block stays gated on `status !== 'Confirmed'`, identical to today.

### Submit contract

- The only server round-trip is the Generate submit. The request carries a tuple-branch discriminator plus a **`time[]` array only** — `weekday[]` is dropped. The server maps `time[i]` to weekday `i+1`; it never trusts a client-supplied weekday.
- Time parsing reuses the existing locale-aware time-only helper. Empty strings are not errors: an empty row is **skipped** at the parse boundary. A non-empty string that fails the locale grammar marks that row's index as invalid.
- If every row is empty (or every non-empty row is invalid), no tuples reach the generator: inline message, no DB write.
- The submitted `time[]` values round-trip through the re-render for both the success and the error partial, so the organizer's input survives the swap. Success shows the localized count toast; the invalid case marks the offending row (`aria-invalid` + inline error under that row's input) and preserves the other rows.

### Domain layer

- No change to the pure generator module: it keeps taking `(weekday, hh, mm)` tuples and walking the window. Empty-time filtering happens at the handler's parse boundary, before tuples are built.
- No change to `proposeDate`, no new `Postponement` field, no DB schema change — generation remains a *use* of existing fields.
- The `action=grow` / `action=remove` branch and the row-count plumbing in the tuple handler are removed.

### Locale

- Existing keys `proposed_dates_generate_add_row` and `proposed_dates_generate_remove_row` are removed from `en.json` / `de.json` (fr-CH/it-CH inherit per ADR-0016).
- `proposed_dates_generate_help` is reworded to describe the fill-to-generate grid.
- Weekday short labels come from the existing locale weekday mapping; no new label keys.

### Documentation

- A small ADR records the fixed-grid decision (locked weekdays, no add/remove, fill-to-generate) with its alternative (free-form rows, client-side row management) and why the grid won.
- A glossary entry is added for the generate interaction, consistent with the domain vocabulary (Match anchor, planning window, Proposed Date).

## Testing Decisions

### What a good test looks like

- Test **external behaviour** only: the rendered HTML contract (7 rows, static weekday labels, empty times, no add/remove controls, presence/absence by status), the handler's response semantics (empty rows skipped, invalid row flagged and others preserved, all-empty no-write), and the e2e flow's user-visible result (filled days land, blank days produce nothing, toast count, status transition). Private helpers and internal reducer state are not asserted.

### Module-by-module test surface

1. **Pure generator** — vitest unit. **Unchanged**: the module does not change, its existing spec stays green and is the seam for the window math, dedupe, DST filtering and anchor fallback.
2. **Section component** — vitest browser. Updated: renders exactly 7 rows Monday..Sunday with static labels and empty time inputs; no add/remove controls; block absent when `Confirmed`. Prior art: existing `proposed-dates-section.spec.tsx`.
3. **POST handler** — vitest unit, mirroring the existing `edit-handlers.spec.ts` pattern. Updated: `time[]`-only tuple branch persists the expected count; empty rows are skipped; a row with a bad time returns a per-row error and preserves the other values; all-empty submits nothing to the store; cap 14 still enforced server-side; rogue POST mixing the tuple branch with the single-date field is rejected. Existing single-date cases remain green.
4. **Locale** — translations spec updated for the removed `add_row` / `remove_row` keys and the reworded `generate_help`.
5. **E2E happy path** — Playwright, Page Object (`EditPage`). Updated: owner fills two weekday rows (leaving others blank), generates, sees the two generated dates in the list, sees the success toast with count 2, sees status chip transition to `Voting`; a blank day produced nothing. Prior art: `e2e-tests/proposed-date-generator.e2e.ts`.

### Seams chosen and why

- Same four-layer seam set as the existing generator, unchanged in shape: e2e (full user path), vitest browser (HTML contract, independent of backend), vitest unit (handler parse/filter semantics), pure unit (window math). No new seams, no new fixtures. The only behavioural gap that closes is at the handler boundary (empty-skip, per-row error), which is why that spec grows.

## Out of Scope

- Schema changes to `Postponement`. The existing `proposedDates` array is the only sink.
- Recurring-rule storage (no `RRULE`-like persistence). Each generated Proposed Date is an independent row.
- Editing the weekday of a row, or changing the row count. The Monday–Sunday grid is fixed.
- Pre-filled default times (e.g. "20:00"). Times start empty by design.
- Client-side row management. Row add/remove was considered and rejected; the grid is server-rendered.
- Cross-month patterns, time-zone selection per row, preview-then-confirm, notifications.
- Any change to the single-date add flow.

## Further Notes

- The generator's window behaviour (anchor fallback, DST-boundary strict-ISO filtering, dedupe at minute precision) is inherited unchanged from the committed module.
- The "preset" is the fixed Monday–Sunday grid itself; the organizer's per-day times are the input. This is the reverse of the earlier free-form model.
- The committed `MAX_TUPLES = 14` stays exported and enforced server-side; it is a guard, not a UI target, once the grid is fixed at 7 rows.

## Comments