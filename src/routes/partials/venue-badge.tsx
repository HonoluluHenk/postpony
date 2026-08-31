import type { JSX } from 'hono/jsx/jsx-runtime';
import type { Venue } from '../../lib/models';

/**
 * Display token for a proposed date's venue in list/poll views. An absent
 * `venueNumber` means venue 1 — legacy dates predate the venues feature.
 */
export function venueNumberToken(venueNumber: number | undefined): string {
  return `V${venueNumber ?? 1}`;
}

/** Looks up a venue by its number; absent `venueNumber` means venue 1 (legacy dates predate venues). */
function findVenue(venueNumber: number | undefined, venues: readonly Venue[]): Venue | undefined {
  return venues.find((v) => v.venueNumber === (venueNumber ?? 1));
}

/**
 * Tooltip text for the venue badge: "1 – Turnhalle orange" when the venue's
 * name is known, otherwise just the number.
 */
export function venueTooltip(venueNumber: number | undefined, venues: readonly Venue[]): string {
  const number = venueNumber ?? 1;
  const venue = findVenue(venueNumber, venues);
  return venue ? `${venue.venueNumber} – ${venue.name}` : String(number);
}

/** The "V1" pill shown next to a proposed date; `title` carries the full venue name when known. */
export function VenueBadge(props: { venueNumber?: number; venues: readonly Venue[] }): JSX.Element {
  return (
    <span class="chip venue-badge" title={venueTooltip(props.venueNumber, props.venues)}>
      {venueNumberToken(props.venueNumber)}
    </span>
  );
}

/**
 * Legend text for a proposed date's venue in the poll: "V1 – Turnhalle orange"
 * when the venue's name is known, otherwise just the number token ("V4").
 * Scraped venue names are full lines ("Turnhalle orange, UG, Schule
 * Dennigkofen"), so only the first comma-segment is shown to keep the legend
 * short; the edit page still shows the full name.
 */
export function venueLegendLabel(venueNumber: number | undefined, venues: readonly Venue[]): string {
  const venue = findVenue(venueNumber, venues);
  const shortName = venue?.name.split(',')[0]?.trim();
  return shortName ? `${venueNumberToken(venueNumber)} – ${shortName}` : venueNumberToken(venueNumber);
}
