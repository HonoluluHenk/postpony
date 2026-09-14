# 06: Venue resolution module

**What to build:** The rule "an absent venue number means venue 1" has one home. A JSX-free venue module exposes the default, a resolve-by-number lookup and the short name; the venue badge component consolidates into one partials module and imports those helpers. Venue occupancy, the calendar export, the badge, the generator's dedup and the rail's fallback all resolve a venue the same way, so the six scattered copies and the duplicated lookup collapse. The organizer sees the same venue pills and tooltips.

**Blocked by:** 05 (agreed order)

**Status:** ready-for-agent

- [x] A JSX-free venue module exposes the default (absent ⇒ 1), `resolveVenue` and `venueShortName`
- [x] The `VenueBadge` component and its label/tooltip helpers consolidate into one partials module importing the new helpers
- [x] Venue occupancy, iCal, badge, generator dedup and rail fallback all use the one default
- [x] The duplicated lookup is deleted
- [x] Badge unit tests and the vote-page e2e that renders venue pills are green; rendered output is unchanged
- [x] `npm run verify` passes

## Comments

- `df05c6d` ticket done, `3ceefa2` review: venue-1 default + lookup consolidated into JSX-free `lib/venues.ts`, `VenueBadge` moved to `partials/venues.tsx`; occupancy/iCal/dedup/rail now share it. No behaviour change; `npm run verify` green (126 e2e).
