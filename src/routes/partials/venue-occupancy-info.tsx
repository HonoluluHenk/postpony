import type { JSX } from 'hono/jsx/jsx-runtime';
import type { TranslateFn } from '../../locales';
import type { VenueOccupancy } from '../../lib/venue-occupancy';

export interface VenueOccupancyInfoProps {
  occupancy?: VenueOccupancy;
  t: TranslateFn;
}

/**
 * Renders the stored venue-occupancy state of one Proposed Date: a count line
 * when other home Matches occupy the date's venue, a clean line when the check
 * ran with a free hall, nothing when the check couldn't run (hand-entered match
 * without a club id, failed occupancy scrape, or never checked). Shared by the
 * owner edit page and the participant vote page so both sides always decide on
 * the same snapshot.
 */
export function VenueOccupancyInfo(props: VenueOccupancyInfoProps): JSX.Element {
  const {occupancy, t} = props;
  if (occupancy === undefined) {
    return <></>;
  }
  if (occupancy.count === 0) {
    return <p class="chip outline mt-2">{t('venue_occupancy_clean')}</p>;
  }
  return (
    <p class="chip outline mt-2">
      {t('venue_occupancy_line', {count: String(occupancy.count)})}
    </p>
  );
}