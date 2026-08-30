# 06: Display venue number in proposed dates list

**What to build:** Shows the venue number next to each proposed date in the edit view and participant poll views, so users know which venue a date is for.

**Blocked by:** 03 (needs `venueNumber` on `ProposedDate` to display)

**Status:** ready-for-agent

- [ ] Edit view proposed dates table (`proposed-dates-section.tsx`) shows venue number (e.g. "V1") next to each date in the date/time column
- [ ] Poll/vote view (`vote-view.tsx` or join route views) shows venue number next to each proposed date
- [ ] Tooltip on venue number shows full name + number when venues are known (e.g. "1 – Turnhalle orange")
- [ ] Legacy dates without `venueNumber` default to displaying "V1" (backward compatibility)
- [ ] Add E2E test: propose a date with venue number, verify it appears in the list
- [ ] All existing unit and E2E tests pass
