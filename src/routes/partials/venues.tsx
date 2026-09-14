import type { JSX } from 'hono/jsx/jsx-runtime';
import type { Venue } from '../../lib/models';
import { defaultVenueNumber, resolveVenue, venueShortName } from '../../lib/venues';

/** Display token for a proposed date's venue in list/poll views, e.g. "(1)". */
export function venueNumberToken(venueNumber: number | undefined): string {
  return `(${defaultVenueNumber(venueNumber)})`;
}

/**
 * Tooltip text for the venue badge: "1 – Turnhalle orange, UG, Schule Dennigkofen" when the venue's
 * name is known, otherwise just the number.
 */
export function venueTooltip(venueNumber: number | undefined, venues: readonly Venue[]): string {
  const venue = resolveVenue(venueNumber, venues);
  return venue ? `${venue.venueNumber} – ${venue.name}` : String(defaultVenueNumber(venueNumber));
}

/**
 * The "(1)" pill shown next to a proposed date; the full venue name is exposed
 * as visually-hidden text when it differs from the visible label. `label`
 * overrides the visible text (the vote page shows the number, short name, and
 * occupancy count inside the pill).
 */
export function VenueBadge(props: { venueNumber?: number; venues: readonly Venue[]; label?: string }): JSX.Element {
  const visible = props.label ?? venueNumberToken(props.venueNumber);
  const full = venueTooltip(props.venueNumber, props.venues);
  const hasName = resolveVenue(props.venueNumber, props.venues) !== undefined;
  return (
    <span class="chip venue-badge">
      {visible}
      {hasName && full !== visible ? <span class="visually-hidden">{full}</span> : null}
    </span>
  );
}

/**
 * The vote pill label: "(1) – Turnhalle orange" (short name only, so the pill
 * stays short) plus the occupancy suffix when the hall is busy. The pill's
 * tooltip still carries the full name.
 */
export function venuePillLabel(venueNumber: number | undefined, venues: readonly Venue[], occupancySuffix?: string): string {
  const shortName = venueShortName(venueNumber, venues);
  const base = shortName ? `${venueNumberToken(venueNumber)} – ${shortName}` : venueNumberToken(venueNumber);
  return occupancySuffix ? `${base}, ${occupancySuffix}` : base;
}
