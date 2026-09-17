import { describe, expect, test } from 'vitest';
import { type AppLocale, type TranslationKeys } from '../../locales';
import { createApp } from '../../lib/__test-utils__/create-app';
import {
  type DateSortableRow,
  availabilityGroupLabel,
  availabilityGroupTooltip,
  currentSortParam,
  groupByAvailabilityBands,
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

describe('availabilityGroupLabel', () => {
  test('maps each domain band kind to its translated header with the date count', () => {
    const {t} = translationApp();

    expect(availabilityGroupLabel('fullStrength', 3, t))
      .toBe('Full strength (3)');
    expect(availabilityGroupLabel('withIfNecessary', 2, t))
      .toBe('With if-necessary (2)');
    expect(availabilityGroupLabel('reducedStrength', 1, t))
      .toBe('Reduced strength (1)');
    expect(availabilityGroupLabel('notPlayable', 0, t))
      .toBe('Not playable (0)');
  });
});

describe('availabilityGroupTooltip', () => {
  test('maps each domain band kind to its translated explanation', () => {
    const {t} = translationApp();

    expect(availabilityGroupTooltip('fullStrength', t))
      .toBe('Enough firm Yes votes to field a full-strength side.');
    expect(availabilityGroupTooltip('withIfNecessary', t))
      .toBe('Full strength only if the if-necessary votes come through.');
    expect(availabilityGroupTooltip('reducedStrength', t))
      .toBe('Below full strength, but enough to play short-handed.');
    expect(availabilityGroupTooltip('notPlayable', t))
      .toBe('Not enough available players, or a date you closed.');
  });
});

describe('groupByAvailabilityBands', () => {
  test('renders the domain bands in order with labelled counts and ranked rows', () => {
    const {t} = translationApp();
    const rows = [
      row('d', '2026-09-15T20:00'),
      row('a', '2026-09-08T20:00'),
      row('c', '2026-09-01T20:00'),
      row('b', '2026-09-22T20:00'),
    ];

    const groups = groupByAvailabilityBands(rows, [
      {kind: 'fullStrength', ids: ['c']},
      {kind: 'withIfNecessary', ids: []},
      {kind: 'reducedStrength', ids: ['a', 'd']},
      {kind: 'notPlayable', ids: ['b']},
    ], t);

    expect(groups.map((group) => ({key: group.key, label: group.label, ids: group.rows.map(({id}) => id)})))
      .toEqual([
        {key: 'fullStrength', label: 'Full strength (1)', ids: ['c']},
        {key: 'withIfNecessary', label: 'With if-necessary (0)', ids: []},
        {key: 'reducedStrength', label: 'Reduced strength (2)', ids: ['a', 'd']},
        {key: 'notPlayable', label: 'Not playable (1)', ids: ['b']},
      ]);
  });

  test('drops band ids with no matching row and counts only the rendered rows', () => {
    const {t} = translationApp();

    const groups = groupByAvailabilityBands([row('a', '2026-09-08T20:00')], [
      {kind: 'fullStrength', ids: ['a', 'missing']},
    ], t);

    expect(groups[0]?.label)
      .toBe('Full strength (1)');
    expect(groups[0]?.rows.map(({id}) => id))
      .toEqual(['a']);
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
