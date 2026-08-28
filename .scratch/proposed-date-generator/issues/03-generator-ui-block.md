# 03: Generator UI block — weekday+time rows with cap

**What to build:** On the edit page's "Proposed Dates" section, the organizer can see and fill a multi-row "Generate" form above the existing single-add input. The form grows up to 14 rows and submits as one batch.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] Generator block renders **above** the existing single-add form, sharing the same section wrapper and headers (DOM order asserted in spec).
- [ ] Block hides when the Postponement is `Confirmed` (mirrors single-add's gate; reopening brings it back).
- [ ] Each row: weekday `<select>` with values from `weekdays_short`, time `<input type="text">` whose placeholder and `lang` mirror the existing single-date field, and a remove-row button with an accessible name.
- [ ] "Add row" button grows the rowset; the cap of 14 is enforced by the partial swap that grows the form — both UI-side button disable and server-validation guard against over-cap submission.
- [ ] Initial render ships with one row.
- [ ] Submit posts to the same proposed-dates endpoint with a discriminator field `generate=tuple`.
- [ ] Success toast state renders the localized count message on `n ≥ 1`.
- [ ] Inline error message renders from a structured `error` prop when the handler reports a zero-result or row-level parse failure.
- [ ] vitest browser spec green for: DOM order (`<generator>` before `<single-add>`), Confirmed-state absence, cap-14 behaviour, row remove/add round-trip, and single-add tests still green (no regression).

## Comments
