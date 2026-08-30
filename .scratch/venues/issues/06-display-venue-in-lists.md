# 06: Display venue number in proposed dates list

**What to build:** Shows the venue number next to each proposed date in the edit view and participant poll views, so users know which venue a date is for.

**Blocked by:** 03 (needs `venueNumber` on `ProposedDate` to display)

**Status:** ready-for-agent

- [x] Edit view proposed dates table (`proposed-dates-section.tsx`) shows venue number (e.g. "V1") next to each date in the date/time column
- [x] Poll/vote view (`vote-view.tsx` or join route views) shows venue number next to each proposed date
- [x] Tooltip on venue number shows full name + number when venues are known (e.g. "1 – Turnhalle orange")
- [x] Legacy dates without `venueNumber` default to displaying "V1" (backward compatibility)
- [x] Add E2E test: propose a date with venue number, verify it appears in the list
- [x] All existing unit and E2E tests pass

## Comments

- 7025965 ticket done: 06-display-venue-in-lists
- 22030f2 review: 06-display-venue-in-lists
- 1eaba19 review-fixed: 06-display-venue-in-lists
- Venue badge (V1..V10, tooltip "1 – Turnhalle orange") in edit date/time column and poll legend; legacy dates default to V1; E2E test + 2 regenerated screenshot baselines.
