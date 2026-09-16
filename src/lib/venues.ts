import type { Venue } from './models';

/**
 * The Venue resolution module: the single home of the "an absent venue number
 * means venue 1" rule. Legacy Proposed Dates predate the venues feature and
 * carry no `venueNumber`, so every reader resolves them the same way instead of
 * re-encoding the default.
 */
export function defaultVenueNumber(venueNumber: number | undefined): number {
  return venueNumber ?? 1;
}

/** Looks a venue up by its number; an absent `venueNumber` resolves to venue 1. */
export function resolveVenue(venueNumber: number | undefined, venues: readonly Venue[]): Venue | undefined {
  return venues.find((v) => v.venueNumber === defaultVenueNumber(venueNumber));
}
