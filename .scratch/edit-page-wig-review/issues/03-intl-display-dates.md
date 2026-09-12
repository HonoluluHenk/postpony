# 03: Display dates use the locale's reading format everywhere

**What to build:** Every date the organizer *reads* on the edit page (page heading, match summary line, Proposed Date card headers) uses the same `Intl`-based reading format as the vote tables (for example `Tu, Sep 15, 2026, 7:30 PM` in en-US, `Di, 15.09.2026, 19:30` in de-CH). Dates the organizer *types* (add-date prefill, generator From/To, placeholders) keep the locale's token format.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] Page heading's date line and the match summary render via the locale-aware `Intl` formatter, not the token formatter
- [x] The prop currently feeding both the heading and the add-date input prefill is split: display value is Intl-formatted, input prefill stays token-formatted
- [x] Proposed Date card short display uses `Intl` short date + short time (weekday prefix retained); its JSDoc example updated
- [x] Add-date input placeholder and prefill are unchanged (token format)
- [x] Component specs for the edit page and proposed-dates section assert the new display format; temporal-utils spec updated
- [x] E2E assertions that hard-code the old `07:30 pm` display style are updated; generator e2e still types token format into inputs

## Comments

- `82055c5` ticket done: 03-intl-display-dates — heading/match-summary use `formatProposedDateDisplay` (Intl medium date + short time, 2-letter weekday prefix); new `proposedDateTimeDisplay` prop feeds the heading while `proposedDateTime` keeps the token format for the add-date prefill; `formatProposedDateDisplayShort` redefined to Intl short date + short time; component/e2e/temporal-utils specs updated. E2E note: `proposed-date-generator.e2e.ts` still has 2 pre-existing date-sensitive failures (hard-coded `2026-09-07..13` / `2026-09-10` windows now in the past), unrelated to this ticket; the generator main test (which exercises the new card short format) passes. Screenshot baselines for the edit page were verified unchanged (card-date pixels are format-agnostic; `--update-snapshots` reproduced the committed bytes).
