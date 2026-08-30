# 03: Single date proposes with venue number

**What to build:** Adds a venue number `<select>` to the single-date form on the edit page. The handler reads the submitted venue number, validates it, and stores it on the new `ProposedDate`.

**Blocked by:** 01 (needs `venueNumber` on `ProposedDate` and `venues` on `Postponement`)

**Status:** ready-for-agent

- [ ] Add a `<select>` for venue number to the single-date form in `proposed-dates-section.tsx`, defaulting to `1`
- [ ] Dropdown shows venue names when `venues.length > 0` (e.g. "1 – Turnhalle orange"), otherwise fixed `1–10`
- [ ] Handler in `proposed-dates-post.ts` reads the submitted `venueNumber` from the form
- [ ] Server validates: if `venues.length > 0`, venueNumber must be `1..venues.length`; if empty, `1..10`
- [ ] Validation error renders as a translated error message via the existing error container
- [ ] Valid `venueNumber` is stored on the new `ProposedDate`
- [ ] Add unit tests to `edit-handlers.spec.ts`:
    - Single date with valid venue number → `ProposedDate.venueNumber` set correctly
    - Venue number out of range → validation error
    - Empty venues → accepts 1–10
- [ ] All existing unit tests pass
