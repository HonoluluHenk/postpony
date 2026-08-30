# Review: 06-display-venue-in-lists

## Findings

- **Formatting (fixed):** `proposed-dates-section.tsx` — the venue-badge `<div class="row items-center gap">` lost its indentation when the `<VenueBadge>` was added; the surrounding block is indented, this line was not.
- **Formatting (fixed):** `venue-badge.tsx` — file ended without a trailing newline.

## Confirmed OK

- Edit view date/time column shows the venue badge (`proposed-dates-section.tsx`).
- Poll view legend shows the venue badge (`vote.tsx`).
- Tooltip carries "number – name" when the venue is known, falls back to just the number (`venueTooltip`).
- Legacy dates without `venueNumber` render "V1" (`venueNumberToken`).
- Both the initial edit render and the HTMX partial get `venues` (`edit.tsx` / `renderEditPartials`); the join poll reads `session.venues`.
- E2E test covers propose-with-venue → badge appears in the list; regenerated the two affected screenshot baselines.