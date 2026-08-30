# 04: Generator proposes dates with venue number

**What to build:** Adds a venue number `<select>` to the date generator form. All generated dates receive the selected venue number.

**Blocked by:** 03 (generator form follows the same UI/handler pattern established in 03)

**Status:** ready-for-agent

- [x] Add a `<select>` for venue number to the generator form in `proposed-dates-section.tsx`, defaulting to `1`
- [x] Dropdown shows venue names when `venues.length > 0`, otherwise fixed `1–10` (reuses the same options as 03)
- [x] Handler in `proposed-dates-post.ts` reads the submitted `venueNumber` from the generator form
- [x] Server validates venue number (same rules as single-date path: 1..venues.length if available, else 1..10)
- [x] All generated dates receive the selected `venueNumber`
- [x] Validation error on venue number renders the generator form with an error, preserving submitted times
- [x] Add unit tests to `edit-handlers.spec.ts`:
    - Generator with valid venue number → all generated dates have that venue number
    - Venue number out of range → validation error
- [x] All existing unit tests pass
