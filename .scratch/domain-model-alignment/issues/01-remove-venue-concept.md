# 01 — Remove the Venue concept from the code

**What to do:** The Venue concept (`Venue` interface, `venueId`/`opponentVenueId` on the session, `maxOverlaps`, `setVenueLimit`, the venue settings UI) is not part of the domain model (see `CONTEXT.md`) and was declared only as scaffolding. Remove it entirely.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Delete the `Venue` interface from `src/lib/models.ts`.
- [ ] Remove `venueId` and `opponentVenueId` from `RescheduleSession`.
- [ ] Remove `maxOverlaps` from `RescheduleSession`.
- [ ] Remove `setVenueLimit` from `src/lib/reschedule.ts`.
- [ ] Delete `src/routes/edit/id/venue-post.ts` and `venue-section.eta`.
- [ ] Remove the `/:id/venue` route from `src/routes/edit/router.ts`.
- [ ] Remove the venue settings block from `edit.eta` and its locale keys (`update_venue_settings`, `venue_management`, `venue_settings_updated`, `max_overlaps`).
- [ ] Delete `aVenue` from `src/lib/__test-utils__/builders.ts` and its spec in `builders.spec.ts`.
- [ ] Update `reschedule.spec.ts`, `edit-handlers.spec.ts` and any e2e tests that touch venue settings.