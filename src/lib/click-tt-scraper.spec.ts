import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { fetchClubs, fetchMeetings, fetchRegions, fetchTeams } from './click-tt-scraper';

const FIXTURES_DIR = join(__dirname, '__fixtures__');

function fixture(name: string): string {
  return readFileSync(join(FIXTURES_DIR, name), 'utf-8');
}

/**
 * Routes a requested URL to the matching downloaded HTML fixture so the
 * scrapers can be tested without hitting the live click-tt.ch site.
 */
function fixtureForUrl(url: string): string {
  if (url.includes('groupPage')) {
    return fixture('meetings.html');
  }
  if (url.includes('clubTeams')) {
    return fixture('teams.html');
  }
  if (url.includes('searchPattern=')) {
    return fixture('clubs.html');
  }
  if (url.includes('clubSearch')) {
    return fixture('regions.html');
  }
  throw new Error(`No fixture for URL: ${url}`);
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn((input: string | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    return Promise.resolve({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: () => Promise.resolve(fixtureForUrl(url)),
    } as Response);
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('click-tt-scraper', () => {
  describe('fetchRegions', () => {
    test('parses all 8 Swiss regions', async () => {
      const regions = await fetchRegions();

      // Exact count per fixture
      expect(regions.length)
        .toBe(8);
    });

    test('parses known region with correct names and codes', async () => {
      const regions = await fetchRegions();

      // Verify known pair from the fixture
      expect(regions)
        .toEqual(
          expect.arrayContaining([
            ({
              name: 'Mittelländischer Tischtennisverband',
              searchPattern: 'CH.05',
              regionName: 'Mittelländischer Tischtennisverband',
            }),
          ]),
        );
    });

    test('includes all expected region codes', async () => {
      const regions = await fetchRegions();

      // Verify all region codes exist
      const codes = regions
        .map((r) => r.searchPattern)
        .sort();
      expect(codes)
        .toEqual([
          'CH.01', 'CH.02', 'CH.03', 'CH.04', 'CH.05', 'CH.06', 'CH.07', 'CH.08',
        ]);
    });

    test('has unique searchPattern values', async () => {
      const regions = await fetchRegions();

      // searchPattern values must be unique (deduplicated)
      const patterns = regions
        .map((r) => r.searchPattern);
      expect(new Set(patterns).size)
        .toBe(patterns.length);
    });
  });

  describe('fetchClubs', () => {
    test('parses all 44 Mittelland clubs', async () => {
      const clubs = await fetchClubs('CH.05', 'Mittelländischer Tischtennisverband');

      // Exact count per Mittelland clubs fixture
      expect(clubs.length)
        .toBe(44);
    });

    test('parses known clubs with correct ids and names', async () => {
      const clubs = await fetchClubs('CH.05', 'Mittelländischer Tischtennisverband');

      // Spot-check a few known entries (ids and names from the fixture)
      expect(clubs)
        .toEqual(
          expect.arrayContaining([
            {id: '33089', name: 'Aarberg'},
            {id: '33110', name: 'Langenthal'},
            {id: '33282', name: 'Ostermundigen'},
            {id: '33137', name: 'Worb'},
          ]),
        );
    });

    test('has unique club IDs', async () => {
      const clubs = await fetchClubs('CH.05', 'Mittelländischer Tischtennisverband');

      // IDs are unique
      const ids = clubs
        .map((c) => c.id);
      expect(new Set(ids).size)
        .toBe(ids.length);
    });
  });

  describe('fetchTeams', () => {
    test('parses all 27 Ostermundigen teams', async () => {
      // Ostermundigen club id
      const teams = await fetchTeams('33282');

      // Exact count per teams fixture
      expect(teams.length)
        .toBe(27);
    });

    test('parses Senioren O40 teams with expected leagues and groups', async () => {
      // Ostermundigen club id
      const teams = await fetchTeams('33282');

      // Senioren O40 teams with expected league, championship and groups
      expect(teams)
        .toEqual(
          expect.arrayContaining([
            {
              name: 'Herren',
              leagueName: 'Herren Nationalliga C Gruppe 3',
              championship: 'STT 25/26',
              group: '216991',
            },
            {
              name: 'Senioren O40',
              leagueName: '2. Liga O40',
              championship: 'MTTV 25/26',
              group: '216862',
            },
            {
              'name': 'Senioren O40 II',
              'leagueName': '3. Liga O40 Gruppe 1',
              'championship': 'MTTV 25/26',
              'group': '216863',
            },
          ]),
        );
    });
  });

  describe('fetchMeetings', () => {
    test('parses meetings with concrete examples from fixture', async () => {
      const meetings = await fetchMeetings('MTTV 25/26', '216862');

      // Verify 3 concrete meeting examples from the fixture
      expect(meetings)
        .toEqual(
          expect.arrayContaining([
            {
              // FIXME: do not parse day
              day: 'Sa.',
              // FIXME: parse date into Temporal.PlainDate
              date: '04.10.2025',
              time: '16:00',
              homeTeam: 'Thun',
              guestTeam: 'Ostermundigen',
            },
            {
              day: 'Di.',
              date: '07.10.2025',
              // FIXME: parse flags
              time: '19:30 v',
              homeTeam: 'Ostermundigen',
              guestTeam: 'Langnau',
            },
            {
              day: 'Mi.',
              date: '25.03.2026',
              time: '19:45',
              homeTeam: 'Worb',
              guestTeam: 'Ostermundigen',
            },
          ]),
        );
    });
  });

  describe('fetchHtml', () => {
    test('throws on non-ok responses', async () => {
      vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: () => Promise.resolve(''),
      } as Response)));

      await expect(fetchRegions())
        .rejects
        .toThrow(/Failed to fetch/);
    });
  });
});
