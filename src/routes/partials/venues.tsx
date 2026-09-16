import type { JSX } from 'hono/jsx/jsx-runtime';
import type { Venue } from '../../lib/models';
import { defaultVenueNumber, resolveVenue } from '../../lib/venues';

/** "(1)" number token for a proposed date's venue; absent number resolves to venue 1. */
function venueNumberToken(venueNumber: number | undefined): string {
  return `(${defaultVenueNumber(venueNumber)})`;
}

/**
 * Short display name; prefers `shortName`, falls back to `name` (venues scraped
 * before `shortName` existed carry only `name`). Undefined when no venue resolves.
 */
function venueDisplayName(venueNumber: number | undefined, venues: readonly Venue[]): string | undefined {
  const venue = resolveVenue(venueNumber, venues);
  return venue ? venue.shortName || venue.name : undefined;
}

/** Full name for the chip's visually-hidden text: "1 – Turnhalle orange, UG, Schule Dennigkofen". */
function venueFullName(venueNumber: number | undefined, venues: readonly Venue[]): string {
  const venue = resolveVenue(venueNumber, venues);
  return venue ? `${venue.venueNumber} – ${venue.name}` : String(defaultVenueNumber(venueNumber));
}

/**
 * The one venue chip shared by the edit list and the vote polls: "(1) Turnhalle
 * orange". `extra` (e.g. the venue occupancy count) appends after a comma. When
 * the venue resolves, its full name is exposed to assistive tech as
 * visually-hidden text wherever it differs from the visible label.
 */
export function VenueChip(props: {
  venueNumber?: number;
  venues: readonly Venue[];
  extra?: string
}): JSX.Element {
  const name = venueDisplayName(props.venueNumber, props.venues);
  const base = name ? `${venueNumberToken(props.venueNumber)} ${name}` : venueNumberToken(props.venueNumber);
  const visible = props.extra ? `${base}, ${props.extra}` : base;
  return (
    <span class="chip venue-chip">
      {visible}
      {name ? <span class="visually-hidden">{venueFullName(props.venueNumber, props.venues)}</span> : null}
    </span>
  );
}
