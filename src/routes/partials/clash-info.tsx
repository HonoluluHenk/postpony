import type { JSX } from 'hono/jsx/jsx-runtime';
import type { AppLocale, TranslateFn } from '../../locales';
import type { DateClashes } from '../../lib/clashes';
import { formatLocalizedDateTime, parseIsoToPlainDateTime } from '../../lib/temporal-utils';

function clashTime(start: string, locale: AppLocale): string {
  return formatLocalizedDateTime(parseIsoToPlainDateTime(start), locale, {timeStyle: 'short'});
}

export interface ClashInfoProps {
  clashes?: DateClashes;
  clashCheckable: boolean;
  t: TranslateFn;
  locale: AppLocale;
}

/**
 * Renders the stored schedule-check state of one Proposed Date: one line per
 * affected team for Clashes, "checked, no clashes" when the check ran clean,
 * "not checked" for hand-entered matches (no team identities), nothing when a
 * scrape failed. Shared by the organizer edit page and the participant vote page
 * so both sides always decide on the same snapshot.
 */
export function ClashInfo(props: ClashInfoProps): JSX.Element {
  const {clashes, clashCheckable, t, locale} = props;
  if (clashes === undefined) {
    // ponytail: a Postponement without team identities can never be checked
    // (hand-entered match); one with identities but no clash data means the
    // last check failed — render nothing, matching "checked" silence.
    return clashCheckable ? <></> : <p class="chip outline mt-2">{t('clash_check_not_checked')}</p>;
  }
  const homeLines = clashes.home.map((clash, index) =>
    <p key={`home-${index}`} class="chip outline mt-2">
      {t('clash_line_home', {time: clashTime(clash.start, locale), opponent: clash.opponent})}
    </p>);
  const awayLines = clashes.away.map((clash, index) =>
    <p key={`away-${index}`} class="chip outline mt-2">
      {t('clash_line_away', {time: clashTime(clash.start, locale), opponent: clash.opponent})}
    </p>);
  if (homeLines.length === 0 && awayLines.length === 0) {
    return <p class="chip outline mt-2">{t('clash_check_clean')}</p>;
  }
  return (
    <>
      {homeLines}
      {awayLines}
    </>
  );
}
