import type { JSX } from 'hono/jsx/jsx-runtime';
import type { App } from '../../app';
import type { AppLocale, TranslateFn } from '../../locales';
import { formatLocalizedDateTime, parseIsoToPlainDateTime } from '../../lib/temporal-utils';

/** How a proposed-dates list orders its rows. */
export type DateSort = 'date' | 'availability';

/** A sortable row needs a stable id and an ISO start for chronological order. */
export interface DateSortableRow {
  id: string;
  dateTimeRange: {
    start: string
  };
}

interface RailGroup<T extends DateSortableRow> {
  key: string;
  label: string;
  range?: string;
  rows: T[];
}

function isoWeekKey(isoStart: string): string {
  const dt = parseIsoToPlainDateTime(isoStart);
  return `${dt.yearOfWeek}-W${String(dt.weekOfYear)
    .padStart(2, '0')}`;
}

function isoWeekRange(isoStart: string, locale: AppLocale): string {
  const date = parseIsoToPlainDateTime(isoStart)
    .toPlainDate();
  const monday = date.subtract({days: date.dayOfWeek - 1});
  const sunday = monday.add({days: 6});
  const a = formatLocalizedDateTime(monday, locale, {month: 'short', day: 'numeric'});
  const b = formatLocalizedDateTime(sunday, locale, {month: 'short', day: 'numeric'});
  return `${a} – ${b}`;
}

export function groupByWeek<T extends DateSortableRow>(
  rows: readonly T[],
  locale: AppLocale,
  t: TranslateFn,
): RailGroup<T>[] {
  const groups: RailGroup<T>[] = [];
  for (const row of rows) {
    const key = isoWeekKey(row.dateTimeRange.start);
    const last = groups[groups.length - 1];
    if (last?.key !== key) {
      const dt = parseIsoToPlainDateTime(row.dateTimeRange.start);
      groups.push({
        key,
        label: t('week_label', {week: String(dt.weekOfYear)}),
        range: isoWeekRange(row.dateTimeRange.start, locale),
        rows: [row],
      });
    } else {
      last.rows.push(row);
    }
  }
  return groups;
}

/**
 * Groups rows by how many available players (Yes + If necessary) each date has.
 * The callers slice the tallies to the viewing captain's own team.
 */
export function groupByAvailability<T extends DateSortableRow>(
  rows: readonly T[],
  availability: Map<string, number>,
  t: TranslateFn,
): RailGroup<T>[] {
  const sorted = [...rows].sort((a, b) => {
    const diff = (availability.get(b.id) ?? 0) - (availability.get(a.id) ?? 0);
    if (diff !== 0) {
      return diff;
    }
    return a.dateTimeRange.start < b.dateTimeRange.start ? -1 : a.dateTimeRange.start > b.dateTimeRange.start ? 1 : 0;
  });
  const groups: RailGroup<T>[] = [];
  for (const row of sorted) {
    const key = String(availability.get(row.id) ?? 0);
    const last = groups[groups.length - 1];
    if (last?.key !== key) {
      groups.push({key, label: t('available_group', {count: key}), rows: [row]});
    } else {
      last.rows.push(row);
    }
  }
  return groups;
}

/** Chronological order by start, id tie-break — the stable base for both sorts. */
export function sortedRows<T extends DateSortableRow>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => {
    if (a.dateTimeRange.start !== b.dateTimeRange.start) {
      return a.dateTimeRange.start < b.dateTimeRange.start ? -1 : 1;
    }
    return a.id < b.id ? -1 : 1;
  });
}

/**
 * The sort choice lives in the URL (`?sort=`). A GET carries it in the query;
 * a mutation posts to a URL without it, so the value is recovered from the
 * browser URL that HTMX forwards as `HX-Current-URL`. Shared by the edit and
 * opponent captain views.
 */
export function currentSortParam(app: App): DateSort {
  return sortValue(app.query('sort')) ?? sortValue(urlSort(app.currentUrl())) ?? 'date';
}

function sortValue(value: string | null | undefined): DateSort | undefined {
  return value === 'availability' ? 'availability' : value === 'date' ? 'date' : undefined;
}

function urlSort(url: string): string | null {
  try {
    return new URL(url).searchParams.get('sort');
  } catch {
    return null;
  }
}

/**
 * The Date / Availability radiogroup that re-sorts a proposed-dates list. Each
 * radio hx-gets `selectUrl` — the page URL with its captain password — and HTMX
 * appends the radio's `sort` value; `target` names the fragment the list
 * belongs to.
 */
export function SortControl(props: {
  sort: DateSort;
  t: TranslateFn;
  selectUrl: string;
  target: string;
}): JSX.Element {
  const option = (value: DateSort, label: string): JSX.Element => (
    <label class="sort-option">
      <input
        type="radio"
        name="sort"
        value={value}
        checked={props.sort === value}
        hx-get={props.selectUrl}
        hx-target={props.target}
        hx-push-url="true"
        hx-trigger="change"
      />
      <span>{label}</span>
    </label>
  );
  return (
    <div class="sort-control" role="radiogroup" aria-label={props.t('sort_by')}>
      <span class="sort-label">{props.t('sort_by')}</span>
      {option('date', props.t('sort_by_date'))}
      {option('availability', props.t('sort_by_availability'))}
    </div>
  );
}
