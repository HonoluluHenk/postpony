# 04: POST handler — tuple branch with dedupe against existing Proposed Dates

**What to build:** The existing single-date POST handler accepts a discriminator and, in the generator branch, parses the weekday+time rows, runs the pure generator with the existing session's Proposed Dates as the dedupe set, and persists each survivor through the existing single-date domain operation.

**Blocked by:** 01, 02

**Status:** ready-for-agent

- [ ] Handler branches on a discriminator field; the existing single-date branch is unchanged (its tests still pass).
- [ ] Generator branch parses parallel `weekday[]` and `time[]` arrays from the form body; each row's time is validated via the new locale helper from ticket 02.
- [ ] Server-side cap 14 enforced at validation time (over-cap POSTs are rejected at the handler seam — `AppError 400` — rather than silently truncated to honour the spec note).
- [ ] Handler invokes the pure module with `tuples`, `existingStarts = session.proposedDates[].dateTimeRange.start`, the session's `originalMatchDateTime` (or `undefined` if absent), and the caller's `today`.
- [ ] On `n ≥ 1`: persists each surviving datetime through repeated `proposeDate()` calls (no new domain verb), renders the standard partial with success toast carrying the count.
- [ ] On `n === 0`: no store write, action preserves the current session unchanged, partial renders with the inline empty-result message.
- [ ] Anchor fallback path: when `originalMatchDateTime` is absent, the response surfaces the `proposed_dates_generate_no_anchor` warning along with the auto-generated rows so the user knows the window anchored on today rather than on the postponed match.
- [ ] Existing single-add end-to-end scenarios (`votes-cascade-after-confirm`, `reopen-from-confirmed`, `add-one-edit-proposed-date`) stay green.
- [ ] Handler unit spec green: tuple-branch happy path, zero-result no-op, row-level invalid time surfaces as a structured error, over-cap rejected, single-add regressions clean.

## Comments
