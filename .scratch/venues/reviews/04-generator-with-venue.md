# Review: 04-generator-with-venue

Reviewed commit: `42d3a8e ticket done: 04-generator-with-venue`

## Standards

- **Duplicated Code (fix recommended):** the `venueNumber` Valibot field
  (`v.optional(v.pipe(v.string(), v.check(..., maxVenueNumber), v.transform(...)))`)
  is now literally duplicated between `buildTupleSchema` and
  `buildSingleDateSchema` in `proposed-dates-post.ts`. Extract a shared
  `venueNumberSchema(app, venues)` helper used by both — this also honors the
  ticket's "do not duplicate" instruction better than a copied block.
- **Judgement call, no action:** the tuple schema-failure path now round-trips
  `times` for every schema error (not just the venue error). This is the
  mechanism that preserves submitted times on a venue failure; it widens
  existing re-renders only by echoing values the same client submitted, so no
  behaviour worth reverting.

## Spec

All acceptance criteria from `04-generator-with-venue.md` are implemented:

- Generator venue `<select>` defaulting to 1 (first option) — present.
- Dropdown reuses ticket 03's `venueOptions` (names or fixed 1–10) — present,
  no duplication of the options builder.
- Handler reads `venueNumber` from the generator form via the tuple schema —
  present.
- Validation: same rules as single-date (`1..venues.length` or `1..10`) via
  `maxVenueNumber` — present.
- All generated dates receive the venue number (attached at the handler after
  generation, per the spec's seam) — present.
- Venue validation error renders the generator form with the error and
  preserves submitted times — present.
- Unit tests: generator-with-venue and out-of-range rejection — present.
- Dedup composite keys correctly left to ticket 05; venue-unaware generator
  untouched. No scope creep.