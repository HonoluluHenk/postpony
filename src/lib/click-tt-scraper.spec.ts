import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { fetchGroups, fetchLeagues, fetchMatches, fetchPlayers, fetchTeams } from './click-tt-scraper';
import { ClickTTError } from './errors';


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
    // Team page (lists the team's matches).
    if (url.includes('teamPortrait')) {
      if (url.includes('teamtable=1732195')) {
        return fixture('team-thun.html');
      }
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
            {name: 'Nationalliga 2026/27', championship: 'STT 26/27'},
            {name: 'MTTV 2026/27', championship: 'MTTV 26/27'},
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
    test('parses all 23 groups of the league', async () => {
      const groups = await fetchGroups('MTTV 26/27');

      // Exact count per league-page fixture
      expect(groups.length)
        .toBe(23);
    });

    test('parses known groups with correct names and ids', async () => {
      const groups = await fetchGroups('MTTV 26/27');

      // Spot-check a few known entries from the fixture
      expect(groups)
        .toEqual(
          expect.arrayContaining([
            {name: 'HE 1. Liga', championship: 'MTTV 26/27', group: '219384'},
            {name: 'HE 2. Liga Gr. 1', championship: 'MTTV 26/27', group: '219386'},
          ]),
        );
    });

    test('has unique group ids', async () => {
      const groups = await fetchGroups('MTTV 26/27');

      // group ids must be unique (deduplicated)
      const ids = groups
        .map((g) => g.group);
      expect(new Set(ids).size)
        .toBe(ids.length);
    });
  });

  describe('fetchTeams', () => {
    test('parses all 8 teams of the group', async () => {
      const teams = await fetchTeams('MTTV 26/27', '219397');

      // Exact count per group-page fixture
      expect(teams.length)
        .toBe(8);
    });

    test('parses known teams with correct names and teamtable ids', async () => {
      const teams = await fetchTeams('MTTV 26/27', '219397');

      // Spot-check a few known entries from the fixture
      expect(teams)
        .toEqual(
          expect.arrayContaining([
            {name: 'Ostermundigen', championship: 'MTTV 26/27', group: '219397', teamtable: '1732193'},
            {name: 'Heimberg', championship: 'MTTV 26/27', group: '219397', teamtable: '1732182'},
          ]),
        );
    });

    test('has unique teamtable ids', async () => {
      const teams = await fetchTeams('MTTV 26/27', '219397');

      const ids = teams
        .map((t) => t.teamtable);
      expect(new Set(ids).size)
        .toBe(ids.length);
    });
  });

  describe('fetchMatches', () => {
    test('parses all matches of the team across both schedule tables', async () => {
      const matches = await fetchMatches('MTTV 26/27', '219397', '1732193');

      // 7 first-half + 7 second-half matches on the team page fixture
      expect(matches.length)
        .toBe(14);
    });

    test('parses matches with concrete examples from fixture', async () => {
      const matches = await fetchMatches('MTTV 26/27', '219397', '1732193');

      // Verify concrete match examples from the team-page fixture
      expect(matches)
        .toEqual(
          expect.arrayContaining([
            {
              day: 'Sat.',
              date: '29.08.2026',
              time: '16:00',
              homeTeam: 'Thun',
              guestTeam: 'Ostermundigen',
            },
            {
              day: 'Mon.',
              date: '07.09.2026',
              time: '00:00',
              homeTeam: 'Ostermundigen',
              guestTeam: 'Port',
            },
            {
              day: 'Tue.',
              date: '30.03.2027',
              time: '00:00',
              homeTeam: 'Ostermundigen',
              guestTeam: 'Bern',
            },
          ]),
        );
    });
  });

  describe('fetchPlayers', () => {
    test('parses the 3 players from the roster table', async () => {
      const players = await fetchPlayers('MTTV 26/27', '219397', '1732193');

      expect(players.length)
        .toBe(3);
    });

    test('parses known player names', async () => {
      const players = await fetchPlayers('MTTV 26/27', '219397', '1732193');

      expect(players)
        .toEqual(
          expect.arrayContaining([
            {name: 'Linder, Christoph'},
            {name: 'Schmid, Oliver'},
            {name: 'Milcu, Sasha'},
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
        .toThrow('click-tt.ch returned 404 Not Found on url https://www.click-tt.ch/index.htm.de');
    });

    test('throws specifically on 5xx responses', async () => {
      vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
        ok: false,
        status: 502,
        statusText: 'Bad Gateway',
        text: () => Promise.resolve(''),
      } as Response)));

      await expect(fetchLeagues())
        .rejects
        .toThrow(ClickTTError);
    });
  });
});
