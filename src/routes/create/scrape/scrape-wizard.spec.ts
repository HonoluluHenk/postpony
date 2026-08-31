import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { App } from '../../../app';
import { LOCALE_KEY } from '../../../locales';
import { MemorySessionStore } from '../../../lib/session-store';
import { handleScrapeGroupsGet } from './groups-get';
import { handleScrapeLeaguesGet } from './leagues-get';
import { handleScrapeMatchesGet } from './matches-get';
import { handleScrapeTeamsGet } from './teams-get';

interface MockOptions {
  queries?: Record<string, string>;
}

function createApp(options: MockOptions = {}): App {
  const {queries = {}} = options;
  const store = new MemorySessionStore();
  const context = {
    get: (key: string): string | undefined => (key === LOCALE_KEY ? 'en-US' : undefined),
    req: {
      param: (): string | undefined => undefined,
      query: (name: string): string | undefined => queries[name],
      header: (): string | undefined => undefined,
      url: 'https://game-scheduler.localhost:3000/',
    },
    html: vi.fn((content: string, init?: ResponseInit) => new Response(content, init)),
  } as any;

  return App.create(context, store);
}

const FIXTURES_DIR = join(__dirname, '../../../lib/__fixtures__');

function fixture(name: string): string {
  return readFileSync(join(FIXTURES_DIR, name), 'utf-8');
}

/**
 * Routes a requested click-tt.ch URL to the matching fixture, mirroring the
 * scraper's own fixture-name mapping so the handlers can render offline.
 */
function fixtureForUrl(url: string): string {
  if (url.includes('teamPortrait')) {
    return url.includes('teamtable=1732195') ? fixture('team-thun.html') : fixture('team.html');
  }
  if (url.includes('groupPage')) {
    return fixture('group.html');
  }
  if (url.includes('leaguePage')) {
    return fixture('groups.html');
  }
  if (url.includes('index.htm')) {
    return fixture('leagues.html');
  }
  throw new Error(`No fixture for URL: ${url}`);
}

function stubClickTtFetch(): void {
  vi.stubGlobal('fetch', vi.fn((input: string | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    return Promise.resolve({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: () => Promise.resolve(fixtureForUrl(url)),
    } as Response);
  }));
}

/** Serves an empty page so every scraper returns an empty collection. */
function stubEmptyClickTt(): void {
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
    text: () => Promise.resolve('<html><body></body></html>'),
  } as Response)));
}

beforeEach(() => {
  stubClickTtFetch();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('scrape wizard GET handlers', () => {
  describe('handleScrapeLeaguesGet', () => {
    test('lists every league from the start-page fixture with drill-down links', async () => {
      const app = createApp();

      const response = await handleScrapeLeaguesGet(app);
      const html = await response.text();

      expect(html).toContain('<h2>Choose your league</h2>');
      expect(html).toContain('MTTV 2026/27');
      expect(html).toContain('Nationalliga 2026/27');
      expect(html).toContain('href="/create/scrape/groups?championship=MTTV%2026%2F27');
      expect((html.match(/href="\/create\/scrape\/groups\?/g) ?? []).length)
        .toBe(12);
      // Mint mode: back goes to the wizard start.
      expect(html).toContain('href="/create/scrape"');
    });

    test('shows the empty message when no leagues are loadable', async () => {
      stubEmptyClickTt();
      const app = createApp();

      const response = await handleScrapeLeaguesGet(app);
      const html = await response.text();

      expect(html).toContain('No leagues could be loaded.');
      expect(html).not.toContain('<ul class="list border">');
    });
  });

  describe('handleScrapeGroupsGet', () => {
    test('lists the league groups with team drill-down links', async () => {
      const app = createApp({queries: {championship: 'MTTV 26/27', leagueName: 'MTTV 2026/27'}});

      const response = await handleScrapeGroupsGet(app);
      const html = await response.text();

      expect(html).toContain('<h2>Choose your group</h2>');
      expect(html).toContain('<strong>MTTV 2026/27</strong>');
      expect(html).toContain('O40 1. Liga');
      expect(html).toContain('HE 1. Liga');
      expect(html).toContain('HE 2. Liga Gr. 1');
      expect(html).toContain('href="/create/scrape/teams?championship=MTTV%2026%2F27&amp;group=219397');
      expect(html).toContain('href="/create/scrape"');
    });

    test('shows the empty message and ignores leftover change parameters (mint back link)', async () => {
      stubEmptyClickTt();
      const app = createApp({
        queries: {
          championship: 'MTTV 26/27',
          sessionId: 'sess-1',
          ownerPassword: 'owner-secret',
        },
      });

      const response = await handleScrapeGroupsGet(app);
      const html = await response.text();

      expect(html).toContain('No groups found for this league.');
      expect(html).not.toContain('<ul class="list border">');
      expect(html).not.toContain('href="/edit/sess-1?ownerPassword=owner-secret"');
      expect(html).toContain('href="/create/scrape"');
    });

    test('throws when the championship query parameter is missing', async () => {
      const app = createApp();

      await expect(handleScrapeGroupsGet(app))
        .rejects
        .toThrow('Missing required parameter: championship');
    });
  });

  describe('handleScrapeTeamsGet', () => {
    test('lists the group teams with matches drill-down links', async () => {
      const app = createApp({
        queries: {
          championship: 'MTTV 26/27',
          group: '219397',
          leagueName: 'MTTV 2026/27',
          groupName: 'O40 1. Liga',
        },
      });

      const response = await handleScrapeTeamsGet(app);
      const html = await response.text();

      expect(html).toContain('<h2>Choose your team</h2>');
      expect(html).toContain('Ostermundigen');
      expect(html).toContain('Thun');
      expect(html).toContain('href="/create/scrape/matches?championship=MTTV%2026%2F27&amp;group=219397&amp;teamtable=1732193&amp;teamName=Ostermundigen');
      expect(html).toContain('href="/create/scrape/groups?championship=MTTV%2026%2F27&amp;leagueName=MTTV%202026%2F27"');
    });

    test('shows the empty message and ignores leftover change parameters (mint back link)', async () => {
      stubEmptyClickTt();
      const app = createApp({
        queries: {
          championship: 'MTTV 26/27',
          group: '219397',
          sessionId: 'sess-1',
          ownerPassword: 'owner-secret',
        },
      });

      const response = await handleScrapeTeamsGet(app);
      const html = await response.text();

      expect(html).toContain('No teams found for this group.');
      expect(html).not.toContain('<ul class="list border">');
      expect(html).not.toContain('href="/edit/sess-1?ownerPassword=owner-secret"');
      expect(html).toContain('href="/create/scrape/groups');
    });

    test('throws when the group query parameter is missing', async () => {
      const app = createApp({queries: {championship: 'MTTV 26/27'}});

      await expect(handleScrapeTeamsGet(app))
        .rejects
        .toThrow('Missing required parameter: group');
    });
  });

  describe('handleScrapeMatchesGet', () => {
    test('lists the team matches with one select form per match and opponent teamtables', async () => {
      const app = createApp({
        queries: {
          championship: 'MTTV 26/27',
          group: '219397',
          teamtable: '1732193',
          leagueName: 'MTTV 2026/27',
          groupName: 'O40 1. Liga',
          teamName: 'Ostermundigen',
        },
      });

      const response = await handleScrapeMatchesGet(app);
      const html = await response.text();

      expect(html).toContain('<h2>Choose the match to reschedule</h2>');
      expect(html).toContain('29.08.2026');
      expect(html).toContain('16:00');
      expect(html).toContain('Thun');
      expect(html).toContain('Ostermundigen');
      // 14 match rows + 1 header row in the schedule table.
      expect((html.match(/<tr>/g) ?? []).length)
        .toBe(15);
      // Exactly one submit button per match row (14 rows → 14 buttons),
      // none carrying the team as a button value.
      expect((html.match(/<button type="submit"/g) ?? []).length)
        .toBe(14);
      expect(html).not.toContain('<button type="submit" name="teamName"');
      // The chosen team travels in every match form as a hidden field:
      // 14 match rows, each carrying the picked team.
      expect((html.match(/name="teamName"/g) ?? []).length)
        .toBe(14);
      expect(html).toContain('name="teamName" value="Ostermundigen"');
      // Thun (the 29.08.2026 opponent) resolves to the team-thun teamtable.
      expect(html).toContain('name="opponentTeamtable" value="1732195"');
      // The picked team's roster is threaded as playerName hidden inputs in
      // every match form: 3 players × 14 match rows.
      expect((html.match(/name="playerName"/g) ?? []).length)
        .toBe(42);
      expect(html).toContain('name="playerName" value="Linder, Christoph"');
      expect(html).toContain('name="playerName" value="Schmid, Oliver"');
      expect(html).toContain('href="/create/scrape/teams?championship=MTTV%2026%2F27&amp;group=219397&amp;groupName=O40%201.%20Liga&amp;leagueName=MTTV%202026%2F27"');
    });

    test('does not thread change-mode context into create forms or links', async () => {
      const app = createApp({
        queries: {
          championship: 'MTTV 26/27',
          group: '219397',
          teamtable: '1732193',
          leagueName: 'MTTV 2026/27',
          groupName: 'O40 1. Liga',
          teamName: 'Ostermundigen',
          sessionId: 'sess-1',
          ownerPassword: 'owner-secret',
        },
      });

      const response = await handleScrapeMatchesGet(app);
      const html = await response.text();

      expect(html).not.toContain('name="sessionId"');
      expect(html).not.toContain('name="ownerPassword"');
      expect(html).not.toContain('href="/edit/sess-1?ownerPassword=owner-secret"');
      // Mint back link is threaded as before.
      expect(html).toContain('href="/create/scrape/teams');
    });

    test('shows the empty message when the team has no matches', async () => {
      stubEmptyClickTt();
      const app = createApp({
        queries: {championship: 'MTTV 26/27', group: '219397', teamtable: '1732193'},
      });

      const response = await handleScrapeMatchesGet(app);
      const html = await response.text();

      expect(html).toContain('No matches found for this team.');
      expect(html).not.toContain('<table');
    });

    test('throws when a required drill-down parameter is missing', async () => {
      const app = createApp({queries: {championship: 'MTTV 26/27', group: '219397'}});

      await expect(handleScrapeMatchesGet(app))
        .rejects
        .toThrow('Missing required parameter: teamtable');
    });
  });
});
