# 03: Single date proposes with venue number

**What to build:** Adds a venue number `<select>` to the single-date form on the edit page. The handler reads the submitted venue number, validates it, and stores it on the new `ProposedDate`.

**Blocked by:** 01 (needs `venueNumber` on `ProposedDate` and `venues` on `Postponement`)

**Status:** ready-for-agent

- [x] Add a `<select>` for venue number to the single-date form in `proposed-dates-section.tsx`, defaulting to `1`
- [x] Dropdown shows venue names when `venues.length > 0` (e.g. "1 – Turnhalle orange"), otherwise fixed `1–10`
- [x] Handler in `proposed-dates-post.ts` reads the submitted `venueNumber` from the form
- [x] Server validates: if `venues.length > 0`, venueNumber must be `1..venues.length`; if empty, `1..10`
- [x] Validation error renders as a translated error message via the existing error container
- [x] Valid `venueNumber` is stored on the new `ProposedDate`
- [x] Add unit tests to `edit-handlers.spec.ts`:
    - Single date with valid venue number → `ProposedDate.venueNumber` set correctly
    - Venue number out of range → validation error
    - Empty venues → accepts 1–10
- [x] All existing unit tests pass

## Comments

- `5b8ad52` ticket done: single-date venue select + handler validation (1..venues.length or 1..10) + storage on `ProposedDate`; `f966a33` review-fixed: extracted duplicated fallback to `FALLBACK_VENUE_COUNT`; `4fd8760` review: findings saved under `.scratch/venues/reviews/`.