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

/**
 * The "V1" pill shown next to a proposed date; `title` carries the full venue
 * name when known. `label` overrides the visible text (the vote page shows the
 * number, short name, and occupancy count inside the pill).
 */
export function VenueBadge(props: { venueNumber?: number; venues: readonly Venue[]; label?: string }): JSX.Element {
  return (
    <span class="chip venue-badge" title={venueTooltip(props.venueNumber, props.venues)}>
      {props.label ?? venueNumberToken(props.venueNumber)}
    </span>
  );
}

/**
 * First comma-segment of a venue's name for the vote pill, e.g. "Turnhalle
 * orange" from "Turnhalle orange, UG, Schule Dennigkofen"; undefined when the
 * venue number is unknown.
 */
export function venueShortName(venueNumber: number | undefined, venues: readonly Venue[]): string | undefined {
  return findVenue(venueNumber, venues)?.name.split(',')[0]?.trim();
}

/**
 * The vote pill label: "V1 – Turnhalle orange" (short name only, so the pill
 * stays short) plus the occupancy suffix when the hall is busy. The pill's
 * tooltip still carries the full name.
 */
export function venuePillLabel(venueNumber: number | undefined, venues: readonly Venue[], occupancySuffix?: string): string {
  const shortName = venueShortName(venueNumber, venues);
  const base = shortName ? `${venueNumberToken(venueNumber)} – ${shortName}` : venueNumberToken(venueNumber);
  return occupancySuffix ? `${base}, ${occupancySuffix}` : base;
}
