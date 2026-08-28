Status: ready-for-agent

# Spec — Helper to Generate Proposed Dates

## Problem Statement

As a Postponement organizer (match owner), I need to propose a small grid of candidate re-match slots — one per training night across the next few weeks — so that my team and the opponent can vote. Today the edit page accepts one Proposed Date at a time; for a full slate I must type and submit each datetime individually, repeating the picker interaction for every slot. I want to declare a pattern (e.g. "Mondays 20:00, Wednesdays 19:30") once and have the app propose every matching slot inside the right planning window.

## Solution

The edit page's "Proposed Dates" section gains a **Generate** block above the existing single-date input. The organizer adds up to 14 weekday+time rows (more than one per weekday allowed), submits once, and the app appends to the Postponement every datetime that matches a row inside the planning window — anchored on the postponed Match's `originalMatchDateTime` (per the glossary entry for *Match* and ADR-0017), bounded 8 weeks back and 4 weeks forward, dropping past dates.

Generated Proposed Dates reuse the existing domain operation `PostponementRules.proposeDate()`. Generation is idempotent on duplicate datetimes (silently skipped), single-shot (no preview step), hidden when the Postponement is `Confirmed` (consistent with today's add-form behaviour), and `<=14` rows are capped (client and server).

## User Stories

1. As a Postponement owner, I want to provide a list of weekday+time patterns, so that I can propose a typical training-night slate without typing each datetime one by one.
2. As a Postponement owner, I want the safe planning window to be relative to the match I'm postponing, so that proposed dates stay realistic.
3. As a Postponement owner, I want the planner to skip dates already proposed, so that I don't accidentally create duplicate rows.
4. As a Postponement owner, I want the planner to never produce a date in the past, so that voters never see obsolete options.
5. As a Postponement owner, I want to enter more than one slot per weekday (e.g. early and late practice), so that my team's varied schedules are represented.
6. As a Postponement owner, I want up to 14 patterns per submission, so that I can model a full week's worth of options in one step.
7. As a Postponement owner, I want a confirmation count ("12 dates added") after the generate, so that I know how many rows landed.
8. As a Postponement owner, I want an inline message when nothing was added (all duplicates, all in the past, or all invalid), so that I can correct my input rather than guess whether anything happened.
9. As a Postponement owner, I want the Generate block to disappear once the Postponement is `Confirmed`, so that the affordances match the lifecycle state.
10. As a Postponement owner, I want to see the generator next to the manual single-add field, so that I can mix batch generation with one-off tweaks.
11. As a Postponement owner in `de-CH`, I want weekday dropdown labels in German (`Mo, Di, Mi, …`), so the picker matches my locale.
12. As a Postponement owner in `en-US`, I want the time input to take `hh:mm aa` (12-hour with am/pm), so that my entry matches the rest of PostPony (ADR-0016).
13. As a Postponement owner on a Swiss timezone, I want impossible wall-times (`Sun 02:30` on the spring-forward Sunday) to be rejected at the row level, so that the strict ISO parser doesn't silently balance them (mirrors single-add today via `Temporal.PlainDateTime.from`).
14. As a Postponement owner whose `originalMatchDateTime` is missing, I want the planner to fall back to `[today, today + 4w]` and surface a warning, so that the feature still works for edge-case Postponements.
15. As a participant (voter), I want the generated Proposed Dates to appear in the same list with the same removal / votable-by-opponent toggles as hand-added ones, so that voting is one consistent flow (ADR-0014 / 0019).
16. As a screen-reader user, I want each generator row to be labelled and the row-removal / row-add controls to have accessible names, so that I can drive the UI without a pointer.
17. As a developer, I want the generator logic to be a pure function over the existing `ProposedDate` model, so that corner-case math is unit-testable without a Hono context.
18. As a developer, I want the new POST branch to live in the same handler as the existing single-date POST, so that there is only one route to maintain and only one place to thread owner-auth.
19. As a developer, I want the generator's locale strings added to `en.json` and `de.json`, fr-CH/it-CH inheriting English (ADR-0016 explicit decision).

## Implementation Decisions

### Pure generator module

- A new pure module exposes a single function `generateProposedDates({ anchorIso, todayIso, tuples, existingStarts }) → { added: string[], skipped: number }`. Inputs and outputs are ISO strings (matching what `proposeDate()` already stores). Non-determinism is funneled through the caller's `now` (no clock hidden inside the module).
- Walking the window: for each tuple `(weekday, hh, mm)`, start at `max(today, anchor − 8 weeks)`, advance by `7 days` while `<= anchor + 4 weeks`. Each candidate is a `Temporal.PlainDateTime`, validated by the strict-ISO `Temporal.PlainDateTime.from` round-trip (existing `temporal-utils.ts:91-94`) so DST-impossible wall-times are filtered naturally.
- Dedupe at minute precision against `existingStarts`; duplicates contribute to `skipped`, never to `added`. Equal weekday tuples at **different times** both produce independent dates.
- Anchor fallback: if `anchorIso` is `undefined`, treat the lower bound as the caller's `today` and the upper bound as `today + 4 weeks`. The caller surfaces a user-facing warning ("No match anchor — using today").

### Locale-aware time-input helper

- A small helper `parseLocaleTimeOnly(value, locale)` returns `{ hour, minute } | undefined`, reusing the locale grammar already encoded in `parseLocaleDateTime` for the time part. Reuses `localeConfigs[locale].clock24` so 24h and 12h (`am`/`pm`) inputs share a code path. fr-CH/it-CH continue to render in 24-hour form per ADR-0016's format table.

### Handler change

- The existing single-date POST handler receives a discriminator: when the request indicates the generator branch (e.g. a `generate=tuple` field), it parses parallel `weekday[]` and `time[]` arrays, validates each row (cap 14), runs the generator, and loops `proposeDate()` per added datetime. The branches share pre- and post-processing: owner-password enforcement, locale, partial-vs-full render, success-toast injection.
- Single-date POST behaviour is unchanged; existing tests still cover it.

### UI change

- A new `<form>` (HTMX; same `hx-target="#proposed-dates-management"`) renders **above** the existing single-date form, gated by `status !== 'Confirmed'` (mirrors the single-add block's rule). One submit button. Each row: a `<select>` for weekday (values from `weekdays_short` per locale), a `<input type="text">` for time (placeholder, `lang`, and parse grammar matching the existing single-date field — ADR-0016), and a remove-row button. An "Add weekday" button grows the rowset up to the cap.
- Initial render ships with one row; subsequent rows are added / removed by rewriting the form during a partial swap (no client-side JS state).
- The success toast on `n >= 1` carries the localized count message; on `n === 0` an inline validator message is shown, no toast, no DB write.

### Locale keys (added in `en.json`, mirrored in `de.json`; fr-CH/it-CH inherit per ADR-0016)

- `proposed_dates_generate_section` — heading
- `proposed_dates_generate_help` — helper text under heading
- `proposed_dates_generate_button` — submit
- `proposed_dates_generate_added` — toast with `count` param
- `proposed_dates_generate_none` — inline empty-result message
- `proposed_dates_generate_add_row` — add-row button
- `proposed_dates_generate_remove_row` — row remove button
- `proposed_dates_generate_no_anchor` — fallback warning
- `weekdays_short` — array of seven short weekday labels

### What we deliberately do NOT introduce

- No new ADR (the reasoning is recorded in tests + ponytail comments).
- No new `Postponement` field — generation is a *use* of existing fields, not new state.
- No new DB schema, no new tables.
- No preview step, no modal, no drag-and-drop date chips.

## Testing Decisions

### What a good test looks like

- Test **external behaviour** only: the pure generator's output list given inputs; the rendered HTML's structural contract (presence / absence / order of the generator block); the POST handler's response semantics (success toast, inline error, no DB write on zero-result); the e2e flow's user-visible result (rows appended, status transition, deletion of unwanted rows still works).
- Implementation details — private helper names, internal reducer state, exact class layout of components — are not asserted.

### Module-by-module test surface

1. **Pure generator** — vitest unit. Cases: anchor in the present → window produces the expected ISO list; past dates dropped on either edge of the window; weekday tuples at distinct times both yield rows; duplicate-of-existing silenced via `skipped`; DST Sunday impossible times excluded; cap of 14 tuples yields exactly 14 datetimes; anchor missing → fallback window; empty tuple list → empty `added`, `skipped === 0`. Prior art: `src/lib/postponement.ts` and its spec — same test shape (small spec, factory `now`).
2. **Section component** — vitest browser. Cases: generator block renders above the single-date block when status is `Voting` or `Draft` and absent when status is `Confirmed`; row-cap 14 enforced on add; toast count renders on `success`; inline error renders on `error`. Prior art: existing `proposed-dates-section.spec.tsx` (read state for `Confirmed` reused).
3. **POST handler** — vitest unit, mirroring the existing pattern used in `edit-handlers.spec.ts` (minimal context). Cases: tuple branch with valid rows persists the expected number of ProposedDates; zero-result path does not touch the store; cap 14 enforced server-side; rogue POST with `generate=tuple` + manual `proposedDateTime` is rejected. Existing single-date cases remain green.
4. **Locale helper (`parseLocaleTimeOnly`)** — vitest unit, colocated with the generator spec. Cases: 24h parses; 12h parses; 12h without `am/pm` rejected; seconds ignored; out-of-range hour/minute rejected.
5. **E2E happy path** — Playwright, Page Object (`EditPage`). Cases: owner fills two weekday+time rows, submits, sees the generated dates in `#proposed-date-list`, sees the success toast with the count, sees status chip transition to `Voting`; can delete one of the generated rows the same way as a hand-entered row; generator block is hidden after reopen + re-confirm cycle. Prior art: `e2e-tests/postponement-editing.e2e.ts`, `focus-management.e2e.ts`.

### Seams chosen and why

- **Highest broad seam**: e2e covers the full path (form render → fill → submit → swap → list render). One seam for "the user did the thing and saw N rows."
- **Mid seam**: vitest browser spec covers the HTML contract independently of the backend (asserts DOM order, presence / absence, label semantics). Allows asserting behaviour that the e2e would be flaky about (e.g. Confirmed-state absence).
- **Lowest seam**: pure unit spec covers the math (anchor fallback, DST, dedupe, cap). Lets the corner cases be exhaustive without paying for browser launches.
- **No new fixtures, no new harness.** Existing builders and `SessionFixture` are sufficient.

## Out of Scope

- Schema changes to `Postponement`. The existing `proposedDates` array is the only sink.
- Recurring-rule storage (no `RRULE`-like persistence). Each generated Proposed Date is an independent row.
- Cross-month patterns ("first Monday of each month"). Day-by-day stepping is enough.
- Time-zone selection per tuple. Wall-clock in `Europe/Zurich` matches today's calendar semantics; storage remains zone-less (per existing `PlainDateTime` representation).
- UI for editing generated dates as a group. They flow through the existing list controls.
- Notifications or reminders to participants on generation.
- ADR writeup. Ponytail comments and tests are the documentation surface.
- Preview-then-confirm two-step interaction.

## Further Notes

- The generator's behaviour at the DST boundary is a property of `Temporal.PlainDateTime` strict-ISO parsing — no special handling is added; this is intentional consistency with single-add today.
- Cap = 14 sits comfortably above "two slots per weekday × 7 weekdays" while keeping the form smaller than the screen at typical viewport widths. Both client (HTMX-rendered count) and server (validation) enforce it; the server's enforcement is the security-relevant one.
- Anchor fallback is the spec-defined behaviour, not a workaround. Postponements without `originalMatchDateTime` (possible in unusual creation flows) still get a useful generator.
- The discriminator field name (`generate=tuple`) is implementation detail; it's named here only to anchor the handler discussion.

## Comments
