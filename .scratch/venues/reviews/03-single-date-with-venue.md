# Review: 03-single-date-with-venue

Reviewed `c239382...HEAD` (10 files, +225/−26) along two axes.

## Standards

- **Duplicated Code** (fixed): the spec rule "empty venues → 1..10" was encoded
  twice — `maxVenueNumber`'s `: 10` in `proposed-dates-post.ts` and
  `Array.from({length: 10}, …)` in `proposed-dates-section.tsx`. Extracted to
  `FALLBACK_VENUE_COUNT` exported from `proposed-dates-section.tsx`, imported by
  the handler. (commit `f966a33`)
- No other documented-standard breaches; `tsc` + ESLint clean, coverage ≥ 80%
  on a clean tree.

## Spec

- All 8 acceptance criteria implemented and covered by unit tests.
- No missing or out-of-scope behaviour. Absent `venueNumber` stays `undefined`
  (read-time default venue 1), matching the spec's backward-compat decision.
- Scope correctly limited to the single-date form; generator, dedup, display,
  and scraper paths are owned by tickets 04/05/06/02 and untouched.