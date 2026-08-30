# 04: Generator proposes dates with venue number

**What to build:** Adds a venue number `<select>` to the date generator form. All generated dates receive the selected venue number.

**Blocked by:** 03 (generator form follows the same UI/handler pattern established in 03)

**Status:** ready-for-agent

- [ ] Add a `<select>` for venue number to the generator form in `proposed-dates-section.tsx`, defaulting to `1`
- [ ] Dropdown shows venue names when `venues.length > 0`, otherwise fixed `1–10` (reuses the same options as 03)
- [ ] Handler in `proposed-dates-post.ts` reads the submitted `venueNumber` from the generator form
- [ ] Server validates venue number (same rules as single-date path: 1..venues.length if available, else 1..10)
- [ ] All generated dates receive the selected `venueNumber`
- [ ] Validation error on venue number renders the generator form with an error, preserving submitted times
- [ ] Add unit tests to `edit-handlers.spec.ts`:
    - Generator with valid venue number → all generated dates have that venue number
    - Venue number out of range → validation error
- [ ] All existing unit tests pass
