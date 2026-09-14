import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'node-html-parser';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import config from '../config';
import {
  extractClubId,
  fetchClubId,
  fetchClubMeetings,
  fetchGroups,
  fetchLeagues,
  fetchMatches,
  fetchPlayers,
  fetchTeams,
  fetchVenues,
  seasonWindow,
} from './click-tt-scraper';
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
    // Club page (lists the club's venues).
    if (url.includes('clubInfoDisplay')) {
      return fixture('club-venues.html');
    }
    // Club meeting search (lists the club's meetings with venue numbers).
    if (url.includes('clubMeetings')) {
      return fixture('club-meetings.html');
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

  describe('extractClubId', () => {
    test('returns the home team club id when the organizer is the away team', () => {
      const root = parse(fixture('team.html'));

      expect(extractClubId(root, {
        date: '29.08.2026',
        time: '16:00',
        homeTeam: 'Thun',
        guestTeam: 'Ostermundigen',
      }))
        .toBe('33132');
    });

    test('returns the home team club id when the organizer is the home team', () => {
      const root = parse(fixture('team-thun.html'));

      expect(extractClubId(root, {
        date: '29.08.2026',
        time: '16:00',
        homeTeam: 'Thun',
        guestTeam: 'Ostermundigen',
      }))
        .toBe('33132');
    });

    test('returns the opponent club id for an away match', () => {
      const root = parse(fixture('team-thun.html'));

      expect(extractClubId(root, {
        date: '17.09.2026',
        time: '20:00',
        homeTeam: 'Bern',
        guestTeam: 'Thun',
      }))
        .toBe('33091');
    });

    test('returns undefined when the postponed match row has no club link', () => {
      const root = parse(
        '<table class="result-set">' +
        '<tr>' +
        '<td>Sat.</td><td>29.08.2026</td><td>16:00</td><td class="center"></td>' +
        '<td>1</td><td>Thun</td><td></td><td>Ostermundigen</td><td></td>' +
        '</tr>' +
        '</table>',
      );

      expect(extractClubId(root, {
        date: '29.08.2026',
        time: '16:00',
        homeTeam: 'Thun',
        guestTeam: 'Ostermundigen',
      }))
        .toBeUndefined();
    });

    test('returns undefined when no row matches the postponed match', () => {
      const root = parse(fixture('team.html'));

      expect(extractClubId(root, {
        date: '01.01.2099',
        time: '00:00',
        homeTeam: 'None',
        guestTeam: 'Nowhere',
      }))
        .toBeUndefined();
    });
  });

  describe('fetchClubId', () => {
    test('fetches the team page and returns the home team club id', async () => {
      const clubId = await fetchClubId('MTTV 26/27', '219397', '1732193', {
        date: '29.08.2026',
        time: '16:00',
        homeTeam: 'Thun',
        guestTeam: 'Ostermundigen',
      });

      expect(clubId)
        .toBe('33132');
    });
  });

  describe('fetchVenues', () => {
    test('parses all venues from the club page in venue-number order', async () => {
      const venues = await fetchVenues('33282');

      expect(venues.length)
        .toBe(3);
      expect(venues.map((v) => v.venueNumber))
        .toEqual([1, 2, 3]);
    });

    test('parses venue details from the fixture', async () => {
      const venues = await fetchVenues('33282');

      expect(venues)
        .toEqual(
          expect.arrayContaining([
            {
              venueNumber: 1,
              name: 'Turnhalle orange, UG, Schule Dennigkofen',
              shortName: 'Turnhalle orange',
              address: 'Dennigkofenweg 169',
              postalCode: '3072',
              city: 'Ostermundigen',
            },
            {
              venueNumber: 3,
              name: 'Turnhalle Weiher',
              shortName: 'Turnhalle Weiher',
              address: 'Weiherweg 2',
              postalCode: '3072',
              city: 'Ostermundigen',
            },
          ]),
        );
    });
  });

  describe('fetchClubMeetings', () => {
    test('returns only the club home Matches with their venue numbers', async () => {
      const matches = await fetchClubMeetings('33282', '01.07.2026', '30.06.2027');

      expect(matches.length)
        .toBe(6);
      expect(matches)
        .toEqual(
          expect.arrayContaining([
            {
              day: 'Di',
              date: '25.08.2026',
              time: '19:30',
              homeTeam: 'Ostermundigen V',
              guestTeam: 'Köniz II',
              venueNumber: 1,
            },
            {
              day: 'Mi',
              date: '07.09.2026',
              time: '20:00',
              homeTeam: 'Ostermundigen',
              guestTeam: 'Bern',
              venueNumber: 2,
            },
            {
              day: 'Di',
              date: '30.03.2027',
              time: '20:15',
              homeTeam: 'Ostermundigen',
              guestTeam: 'Port',
              venueNumber: 3,
            },
          ]),
        );
    });

    test('parses same-day continuation rows whose day/date cells are spanned', async () => {
      const matches = await fetchClubMeetings('33282', '01.07.2026', '30.06.2027');

      expect(matches)
        .toEqual(
          expect.arrayContaining([
            {
              day: 'Mi',
              date: '09.09.2026',
              time: '19:45',
              homeTeam: 'Ostermundigen II',
              guestTeam: 'Ostermundigen',
              venueNumber: 1,
            },
            {
              day: 'Mi',
              date: '09.09.2026',
              time: '19:45',
              homeTeam: 'Ostermundigen',
              guestTeam: 'Port',
              venueNumber: 1,
            },
          ]),
        );
    });

    test('excludes rows where the club is the guest team', async () => {
      const matches = await fetchClubMeetings('33282', '01.07.2026', '30.06.2027');

      expect(matches.some((m) => m.homeTeam === 'Thun' && m.guestTeam === 'Ostermundigen'))
        .toBe(false);
    });

    test('yields undefined venueNumber for rows without a venue link', async () => {
      const matches = await fetchClubMeetings('33282', '01.07.2026', '30.06.2027');

      expect(matches)
        .toEqual(
          expect.arrayContaining([
            {
              day: 'So',
              date: '06.12.2026',
              time: '09:00',
              homeTeam: 'Ostermundigen',
              guestTeam: 'Bremgarten II',
              venueNumber: undefined,
            },
          ]),
        );
    });

    test('skips non-match rows, nameless rows, and duplicate rows', async () => {
      vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: () => Promise.resolve(
          '<table class="result-set">' +
          '<tr><td>not enough cells</td></tr>' +
          '<tr><td>Di</td><td>not-a-date</td><td>19:30</td><td></td>' +
          '<td>1</td><td>HE 3. Liga</td><td>Ostermundigen V</td><td></td><td>Köniz II</td>' +
          '<td></td><td></td><td></td><td></td></tr>' +
          '<tr><td>Di</td><td>25.08.2026</td><td>19:30</td><td></td>' +
          '<td>1</td><td>HE 3. Liga</td><td>Ostermundigen V</td><td></td><td>Köniz II</td>' +
          '<td></td><td></td><td></td><td></td></tr>' +
          '<tr><td>Di</td><td>25.08.2026</td><td>19:30</td><td></td>' +
          '<td>1</td><td>HE 3. Liga</td><td>Ostermundigen V</td><td></td><td>Köniz II</td>' +
          '<td></td><td></td><td></td><td></td></tr>' +
          '<tr><td>Di</td><td>25.08.2026</td><td>19:30</td><td></td>' +
          '<td>1</td><td>HE 3. Liga</td><td></td><td></td><td>Köniz II</td>' +
          '<td></td><td></td><td></td><td></td></tr>' +
          '</table>',
        ),
      } as Response)));

      const matches = await fetchClubMeetings('33282', '01.07.2026', '30.06.2027');

      expect(matches.length)
        .toBe(1);
      expect(matches[0])
        .toMatchObject({date: '25.08.2026', homeTeam: 'Ostermundigen V', guestTeam: 'Köniz II'});
    });
  });

  describe('seasonWindow', () => {
    test('derives the from/to season window from a championship', () => {
      expect(seasonWindow('MTTV 26/27'))
        .toEqual({from: '01.07.2026', to: '30.06.2027'});
    });

    test('returns undefined for a championship without a year pair', () => {
      expect(seasonWindow('MTTV'))
        .toBeUndefined();
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

  describe('fixture-backed loading', () => {
    beforeEach(() => {
      config.set('click-tt-fixtures-dir', FIXTURES_DIR);
    });

    afterEach(() => {
      config.set('click-tt-fixtures-dir', '');
    });

    test('reads every page type from the on-disk fixtures', async () => {
      expect(await fetchLeagues())
        .toBeInstanceOf(Array);
      expect(await fetchGroups('MTTV 26/27'))
        .toBeInstanceOf(Array);
      expect(await fetchTeams('MTTV 26/27', '219397'))
        .toBeInstanceOf(Array);
      expect(await fetchMatches('MTTV 26/27', '219397', '1732195'))
        .toBeInstanceOf(Array);
      expect(await fetchPlayers('MTTV 26/27', '219397', '1732193'))
        .toBeInstanceOf(Array);
      expect(await fetchVenues('33282'))
        .toBeInstanceOf(Array);
      expect(await fetchClubMeetings('33282', '01.07.2026', '30.06.2027'))
        .toBeInstanceOf(Array);
      expect(await fetchClubId('MTTV 26/27', '219397', '1732195', {
        date: '29.08.2026',
        time: '16:00',
        homeTeam: 'Thun',
        guestTeam: 'Ostermundigen',
      }))
        .toBeDefined();
    });
  });

  /** Serves one crafted HTML document as the next `fetch` response. */
  function stubHtml(html: string): void {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: () => Promise.resolve(html),
    } as Response)));
  }

  describe('parser skip branches', () => {
    test('fetchLeagues skips blank names, links without a championship, and duplicates', async () => {
      stubHtml(`
        <a href="/wa/leaguePage?championship=A">Alpha</a>
        <a href="/wa/leaguePage?championship=B">   </a>
        <a href="/wa/leaguePage?other=1">Gamma</a>
        <a href="/wa/leaguePage?championship=A">Alpha again</a>
      `);

      expect(await fetchLeagues())
        .toEqual([{name: 'Alpha', championship: 'A'}]);
    });

    test('fetchLeagues rejects a link whose href cannot be parsed as a URL', async () => {
      stubHtml('<a href="http://[invalid/leaguePage?championship=A">Broken</a>');

      expect(await fetchLeagues())
        .toEqual([]);
    });

    test('fetchGroups skips blank names, missing groups, sub-view links, and duplicates', async () => {
      stubHtml(`
        <a href="/wa/groupPage?championship=A&amp;group=1">G1</a>
        <a href="/wa/groupPage?championship=A&amp;group=2">   </a>
        <a href="/wa/groupPage?championship=A&amp;other=4">G</a>
        <a href="/wa/groupPage?championship=A&amp;group=3&amp;displayTyp=table">G3</a>
        <a href="/wa/groupPage?championship=A&amp;group=3&amp;displayDetail=x">G3</a>
        <a href="/wa/groupPage?championship=A&amp;group=3&amp;type=x">G3</a>
        <a href="/wa/groupPage?championship=A&amp;group=1">G1 dup</a>
      `);

      expect(await fetchGroups('A'))
        .toEqual([{name: 'G1', championship: 'A', group: '1'}]);
    });

    test('fetchTeams skips blank names, missing teamtables, and duplicates', async () => {
      stubHtml(`
        <a href="/wa/teamPortrait?teamtable=1">T1</a>
        <a href="/wa/teamPortrait?teamtable=2">   </a>
        <a href="/wa/teamPortrait?other=3">T3</a>
        <a href="/wa/teamPortrait?teamtable=1">T1 dup</a>
      `);

      expect(await fetchTeams('A', 'g'))
        .toEqual([{name: 'T1', championship: 'A', group: 'g', teamtable: '1'}]);
    });

    test('fetchMatches skips short rows, non-date rows, empty teams, and duplicates', async () => {
      stubHtml(`
        <table class="result-set">
          <tr><td>short</td></tr>
          <tr><td>Sa</td><td>no-date</td><td>16:00</td><td>loc</td><td>r1</td><td>Thun</td><td>x</td><td>Oster</td></tr>
          <tr><td>Sa</td><td>29.08.2026</td><td>16:00</td><td>loc</td><td>r1</td><td>Thun</td><td>x</td><td>Oster</td></tr>
          <tr><td>Sa</td><td>29.08.2026</td><td>16:00</td><td>loc</td><td>r1</td><td>Thun</td><td>x</td><td>Oster</td></tr>
          <tr><td>Sa</td><td>29.08.2026</td><td>16:00</td><td>loc</td><td>r1</td><td></td><td>x</td><td>Oster</td></tr>
          <tr><td>Sa</td><td>29.08.2026</td><td>16:00</td><td>loc</td><td>r1</td><td>Thun</td><td>x</td><td></td></tr>
        </table>
      `);

      expect(await fetchMatches('A', 'g', 't'))
        .toEqual([{day: 'Sa', date: '29.08.2026', time: '16:00', homeTeam: 'Thun', guestTeam: 'Oster'}]);
    });

    test('fetchPlayers skips non-roster tables, short rows, summary rows, and blank names', async () => {
      stubHtml(`
        <table class="result-set"><tr><th>Other</th></tr><tr><td>1</td><td>x</td></tr></table>
        <table class="result-set">
          <tr><th>Rang</th><th>Name</th></tr>
          <tr><td>1</td><td>Alice</td></tr>
          <tr><td>2</td><td>   </td></tr>
          <tr><td>Doppel</td><td>Summary</td></tr>
          <tr><td>3</td><td>Bob</td></tr>
        </table>
      `);

      expect(await fetchPlayers('A', 'g', 't'))
        .toEqual([{name: 'Alice'}, {name: 'Bob'}]);
    });

    test('fetchPlayers returns an empty list when no roster table is present', async () => {
      stubHtml('<table class="result-set"><tr><th>Other</th></tr></table>');

      expect(await fetchPlayers('A', 'g', 't'))
        .toEqual([]);
    });

    test('extractClubId returns undefined when the matched row has no club query param', () => {
      const root = parse(`
        <table class="result-set">
          <tr><td>a</td><td>29.08.2026</td><td>16:00</td>
            <td><a href="/wa/clubInfoDisplay?other=1">(1)</a></td>
            <td>r</td><td>Thun</td><td>x</td><td>Ostermundigen</td></tr>
        </table>
      `);

      expect(extractClubId(root, {
        date: '29.08.2026', time: '16:00', homeTeam: 'Thun', guestTeam: 'Ostermundigen',
      }))
        .toBeUndefined();
    });

    test('fetchVenues drops venues with malformed addresses and handles last-child headings', async () => {
      stubHtml(`
        <h2>Spiellokal 1</h2>
        <p>Halle Eins
Dennigkofenweg 169, 3072 Ostermundigen, Schweiz</p>
        <h2>Spiellokal 2</h2>
        <p>NoAddress</p>
        <h2>Spiellokal 3</h2>
        <p>Halle Drei
NurOrt, Schweiz</p>
        <h2>Spiellokal 4</h2>
        <p>Halle Vier
NurOrt, Ostermundigen</p>
        <h2>Spiellokal 5</h2>
        <p>   </p>
        <div><h2>Spiellokal 6</h2></div>
        <p>Halle Sechs
Dennigkofenweg 1, 3072 Ostermundigen</p>
      `);

      expect(await fetchVenues('1'))
        .toEqual([
          {
            venueNumber: 1,
            name: 'Halle Eins',
            shortName: 'Halle Eins',
            address: 'Dennigkofenweg 169',
            postalCode: '3072',
            city: 'Ostermundigen',
          },
          {
            venueNumber: 6,
            name: 'Halle Sechs',
            shortName: 'Halle Sechs',
            address: 'Dennigkofenweg 1',
            postalCode: '3072',
            city: 'Ostermundigen',
          },
        ]);
    });

    test('fetchClubMeetings skips short rows, invalid dates, away meetings, and duplicates', async () => {
      stubHtml(`
        <table class="result-set">
          <tr><td>short</td></tr>
          <tr><td>Sa</td><td>29.08.2026</td><td>16:00</td>
            <td><a href="/wa/clubInfoDisplay?club=1">(2)</a></td>
            <td>r</td><td>x</td><td>Thun</td><td>y</td><td>Oster</td></tr>
          <tr><td>Sa</td><td>29.08.2026</td><td>16:00</td>
            <td><a href="/wa/clubInfoDisplay?club=1">(2)</a></td>
            <td>r</td><td>x</td><td>Thun</td><td>y</td><td>Oster</td></tr>
          <tr><td>Sa</td><td>29.08.2026</td><td>16:00</td>
            <td><a href="/wa/clubInfoDisplay?club=99999">(3)</a></td>
            <td>r</td><td>x</td><td>Away</td><td>y</td><td>X</td></tr>
          <tr><td>Sa</td><td>29.08.2026</td><td>16:00</td>
            <td>no link</td>
            <td>r</td><td>x</td><td>NoVenue</td><td>y</td><td>Y</td></tr>
          <tr><td>Sa</td><td>not-a-date</td><td>16:00</td>
            <td>no link</td>
            <td>r</td><td>x</td><td>Skip</td><td>y</td><td>S</td></tr>
        </table>
      `);

      expect(await fetchClubMeetings('1', '01.07.2026', '30.06.2027'))
        .toEqual([
          {
            day: 'Sa', date: '29.08.2026', time: '16:00', homeTeam: 'Thun', guestTeam: 'Oster', venueNumber: 2,
          },
          {
            day: 'Sa', date: '29.08.2026', time: '16:00', homeTeam: 'NoVenue', guestTeam: 'Y', venueNumber: undefined,
          },
        ]);
    });
  });
});
