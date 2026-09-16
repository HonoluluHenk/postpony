import { describe, expect, test } from 'vitest';
import { type AppLocale, type TranslationKeys } from '../../locales';
import { createApp } from '../../lib/__test-utils__/create-app';
import {
  type DateSortableRow,
  currentSortParam,
  groupByAvailability,
  groupByWeek,
  sortedRows,
} from './sort-control';

const row = (id: string, start: string): DateSortableRow => ({id, dateTimeRange: {start}});

interface TranslationApp {
  locale: AppLocale;
  t: (key: TranslationKeys, params?: Record<string, string>) => string;
}

function translationApp(): TranslationApp {
  const app = createApp();
  return {
    locale: app.locale,
    t: (key: TranslationKeys, params?: Record<string, string>) => app.t(key, params),
  };
}

describe('groupByWeek', () => {
  test('groups chronologically by ISO week and renders the week range', () => {
    const {locale, t} = translationApp();
    const rows = [
      row('a', '2026-09-01T20:00'),
      row('b', '2026-09-08T20:00'),
      row('c', '2026-09-10T20:00'),
    ];

    const groups = groupByWeek(rows, locale, t);

    expect(groups.map((group) => ({
      key: group.key,
      label: group.label,
      range: group.range,
      ids: group.rows.map(({id}) => id),
    })))
      .toEqual([
        {key: '2026-W36', label: 'Week 36', range: 'Aug 31 – Sep 6', ids: ['a']},
        {key: '2026-W37', label: 'Week 37', range: 'Sep 7 – Sep 13', ids: ['b', 'c']},
      ]);
  });
});

describe('groupByAvailability', () => {
  test('orders by count descending (ties chronologically) and merges adjacent groups', () => {
    const {t} = translationApp();
    const rows = [
      row('d', '2026-09-15T20:00'),
      row('a', '2026-09-08T20:00'),
      row('c', '2026-09-01T20:00'),
      row('b', '2026-09-22T20:00'),
      row('e', '2026-09-08T20:00'),
    ];
    const availability = new Map([['a', 1], ['b', 0], ['c', 2], ['d', 1], ['e', 1]]);

    const groups = groupByAvailability(rows, availability, t);

    expect(groups.map((group) => ({label: group.label, ids: group.rows.map(({id}) => id)})))
      .toEqual([
        {label: 'Available: 2', ids: ['c']},
        {label: 'Available: 1', ids: ['a', 'e', 'd']},
        {label: 'Available: 0', ids: ['b']},
      ]);
  });

  test('counts a date missing from the availability map as 0', () => {
    const {t} = translationApp();
    const availability = new Map([['y', 2]]);

    // Both operand orders, so each comparator operand hits the `?? 0` fallback.
    for (const rows of [
      [row('y', '2026-09-08T20:00'), row('x', '2026-09-01T20:00')],
      [row('x', '2026-09-01T20:00'), row('y', '2026-09-08T20:00')],
    ])
    {
      const groups = groupByAvailability(rows, availability, t);

      expect(groups.map((group) => group.label))
        .toEqual(['Available: 2', 'Available: 0']);
    }
  });
});

describe('sortedRows', () => {
  test('orders chronologically and breaks equal starts by id', () => {
    const rows = [
      row('b', '2026-09-08T20:00'),
      row('c', '2026-09-01T20:00'),
      row('a', '2026-09-08T20:00'),
    ];

    expect(sortedRows(rows)
      .map(({id}) => id))
      .toEqual(['c', 'a', 'b']);
  });
});

describe('currentSortParam', () => {
  test('prefers the ?sort= query on a GET an ignores unknown values', () => {
    expect(currentSortParam(createApp({queries: {sort: 'availability'}})))
      .toBe('availability');
    expect(currentSortParam(createApp({queries: {sort: 'date'}})))
      .toBe('date');
    expect(currentSortParam(createApp({queries: {sort: 'bogus'}})))
      .toBe('date');
  });

  test('recovers the sort from HX-Current-URL when the query is absent', () => {
    expect(currentSortParam(createApp({headers: {'HX-Current-URL': 'https://game-scheduler.localhost:3000/opponent/x?opponentCaptainPassword=p&sort=availability'}})))
      .toBe('availability');
    expect(currentSortParam(createApp({url: 'https://game-scheduler.localhost:3000/opponent/x?opponentCaptainPassword=p&sort=date'})))
      .toBe('date');
  });

  test('defaults to date when no sort is present or the current URL is malformed', () => {
    expect(currentSortParam(createApp()))
      .toBe('date');
    expect(currentSortParam(createApp({headers: {'HX-Current-URL': 'not a url'}})))
      .toBe('date');
  });
});
