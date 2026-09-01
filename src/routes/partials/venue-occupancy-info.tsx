import type { JSX } from 'hono/jsx/jsx-runtime';
import type { AppLocale, TranslateFn } from '../../locales';
import type { VenueOccupancy } from '../../lib/venue-occupancy';
import { formatLocalizedDateTime, parseIsoToPlainDateTime } from '../../lib/temporal-utils';

export interface VenueOccupancyInfoProps {
  id: string;
  occupancy?: VenueOccupancy;
  t: TranslateFn;
  locale: AppLocale;
}

function occupancyTime(start: string, locale: AppLocale): string {
  return formatLocalizedDateTime(parseIsoToPlainDateTime(start), locale, {timeStyle: 'short'});
}

/**
 * Renders the stored venue-occupancy state of one Proposed Date: a count chip
 * when other home Matches occupy the date's venue, a clean line when the check
 * ran with a free hall, nothing when the check couldn't run (hand-entered match
 * without a club id, failed occupancy scrape, or never checked). The count chip
 * is a button whose `role="tooltip"` popup lists the conflicting Matches
 * (opponent + localized start time); shown on hover/focus/tap by
 * `initOccupancyTooltips` in ui.js, dismissed by pointer leave, focus loss, or
 * Escape. Shared by the organizer edit page and the participant vote page so both
 * sides always decide on the same snapshot.
 */
export function VenueOccupancyInfo(props: VenueOccupancyInfoProps): JSX.Element {
  const {id, occupancy, t, locale} = props;
  if (occupancy === undefined) {
    return <></>;
  }
  if (occupancy.count === 0) {
    return <p class="chip outline mt-2">{t('venue_occupancy_clean')}</p>;
  }
  const tooltipId = `occupancy-tooltip-${id}`;
  return (
    <div class="venue-occupancy">
      <button
        type="button"
        class="chip outline"
        aria-describedby={tooltipId}
        data-occupancy-trigger="true"
      >
        {t('venue_occupancy_line', {count: String(occupancy.count)})}
      </button>
      <div id={tooltipId} role="tooltip" class="occupancy-tooltip">
        <span class="occupancy-tooltip__title">{t('venue_occupancy_conflicts_title')}</span>
        <ul class="occupancy-tooltip__list">
          {occupancy.matches.map((match, index) => (
            <li key={index}>
              {t('venue_occupancy_match', {time: occupancyTime(match.start, locale), opponent: match.opponent})}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
