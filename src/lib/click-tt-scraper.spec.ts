import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { fetchGroups, fetchLeagues, fetchMeetings, fetchTeams } from './click-tt-scraper';


describe('click-tt-scraper', () => {

  const FIXTURES_DIR = join(__dirname, '__fixtures__');

  function fixture(name: string): string {
    return readFileSync(join(FIXTURES_DIR, name), 'utf-8');
  }

  /**
   * Routes a requested URL to the matching downloaded HTML fixture so the
   * scrapers can be tested without hitting the live click-tt.ch site.
   */
  function fixtureForUrl(url: string): string {
    // Team page (lists the team's meetings).
    if (url.includes('teamPortrait')) {
      return fixture('team.html');
    }
    // Plain group page (lists the teams of a group).
    if (url.includes('groupPage')) {
      return fixture('group.html');
    }
    // League page (lists the groups of a championship).
    if (url.includes('leaguePage')) {
      return fixture('groups.html');
    }
    // Start page (lists the championships / leagues).
    if (url.includes('index.htm')) {
      return fixture('leagues.html');
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

  describe('fetchLeagues', () => {
    test('parses all 12 leagues from the start page', async () => {
      const leagues = await fetchLeagues();

      // Exact count per start-page fixture
      expect(leagues.length)
        .toBe(12);
    });

    test('parses known leagues with correct names and championships', async () => {
      const leagues = await fetchLeagues();

      // Verify known pairs from the fixture
      expect(leagues)
        .toEqual(
          expect.arrayContaining([
            {name: 'Nationalliga 2025/26', championship: 'STT 25/26'},
            {name: 'MTTV 2025/26', championship: 'MTTV 25/26'},
          ]),
        );
    });

    test('has unique championship values', async () => {
      const leagues = await fetchLeagues();

      // championship values must be unique (deduplicated)
      const championships = leagues
        .map((l) => l.championship);
      expect(new Set(championships).size)
        .toBe(championships.length);
    });
  });

  describe('fetchGroups', () => {
    test('parses all 42 groups of the league', async () => {
      const groups = await fetchGroups('MTTV 25/26');

      // Exact count per league-page fixture
      expect(groups.length)
        .toBe(42);
    });

    test('parses known groups with correct names and ids', async () => {
      const groups = await fetchGroups('MTTV 25/26');

      // Spot-check a few known entries from the fixture
      expect(groups)
        .toEqual(
          expect.arrayContaining([
            {name: 'HE 1. Liga', championship: 'MTTV 25/26', group: '216844'},
            {name: 'O40 2. Liga', championship: 'MTTV 25/26', group: '216862'},
          ]),
        );
    });

    test('has unique group ids', async () => {
      const groups = await fetchGroups('MTTV 25/26');

      // group ids must be unique (deduplicated)
      const ids = groups
        .map((g) => g.group);
      expect(new Set(ids).size)
        .toBe(ids.length);
    });
  });

  describe('fetchTeams', () => {
    test('parses all 8 teams of the group', async () => {
      const teams = await fetchTeams('MTTV 25/26', '216848');

      // Exact count per group-page fixture
      expect(teams.length)
        .toBe(8);
    });

    test('parses known teams with correct names and teamtable ids', async () => {
      const teams = await fetchTeams('MTTV 25/26', '216848');

      // Spot-check a few known entries from the fixture
      expect(teams)
        .toEqual(
          expect.arrayContaining([
            {name: 'Ostermundigen', championship: 'MTTV 25/26', group: '216848', teamtable: '1719422'},
            {name: 'Langnau', championship: 'MTTV 25/26', group: '216848', teamtable: '1719418'},
          ]),
        );
    });

    test('has unique teamtable ids', async () => {
      const teams = await fetchTeams('MTTV 25/26', '216848');

      const ids = teams
        .map((t) => t.teamtable);
      expect(new Set(ids).size)
        .toBe(ids.length);
    });
  });

  describe('fetchMeetings', () => {
    test('parses all meetings of the team across both schedule tables', async () => {
      const meetings = await fetchMeetings('MTTV 25/26', '216848', '1722028');

      // 7 first-half + 7 second-half meetings on the team page fixture
      expect(meetings.length)
        .toBe(14);
    });

    test('parses meetings with concrete examples from fixture', async () => {
      const meetings = await fetchMeetings('MTTV 25/26', '216848', '1722028');

      // Verify concrete meeting examples from the team-page fixture
      expect(meetings)
        .toEqual(
          expect.arrayContaining([
            {
              day: 'Wed.',
              date: '03.09.2025',
              time: '20:00',
              homeTeam: 'Münchenbuchsee II',
              guestTeam: 'Ostermundigen IV',
            },
            {
              day: 'Thu.',
              date: '11.12.2025',
              time: '19:45 v',
              homeTeam: 'Heimberg V',
              guestTeam: 'Ostermundigen IV',
            },
            {
              day: 'Wed.',
              date: '25.03.2026',
              time: '19:45',
              homeTeam: 'Ostermundigen IV',
              guestTeam: 'Heimberg V',
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

      await expect(fetchLeagues())
        .rejects
        .toThrow(/Failed to fetch/);
    });
  });
});
