import { describe, expect, test, vi } from 'vitest';
import { App } from '../../../app';
import { LOCALE_KEY } from '../../../locales';
import { MemorySessionStore } from '../../../lib/session-store';
import { handleScrapeMatchPost } from './match-post';

interface MockOptions {
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
}

function createApp(options: MockOptions = {}): App {
  const {headers = {}, body = {}} = options;
  const store = new MemorySessionStore();
  const context = {
    get: (key: string): string | undefined => (key === LOCALE_KEY ? 'en-US' : undefined),
    req: {
      header: (name: string): string | undefined => headers[name],
      parseBody: (): Promise<Record<string, unknown>> => Promise.resolve(body),
    },
    redirect: vi.fn((url: string) => new Response(null, {status: 302, headers: {Location: url}})),
  } as any;

  return App.create(context, store);
}

const MATCH = {
  day: 'Sat.',
  date: '29.08.2026',
  time: '16:00',
  homeTeam: 'Thun',
  guestTeam: 'Ostermundigen',
  groupName: 'O40 1. Liga',
  leagueName: 'MTTV 2026/27',
  championship: 'MTTV 26/27',
  group: '219397',
  playerName: ['Linder, Christoph', 'Schmid, Oliver', 'Milcu, Sasha'],
  // opponentTeamtable left empty so fetchPlayers is not invoked (no network).
  opponentTeamtable: '',
};

async function storedSession(app: App): Promise<ReturnType<App['store']['get']>> {
  const response = await handleScrapeMatchPost(app);
  const location = response.headers.get('Location') ?? '';
  const id = /\/edit\/([^?]+)/.exec(location)?.[1] ?? '';
  return app.store.get(id);
}

describe('handleScrapeMatchPost', () => {
  test('stores organizerTeam "home" when the organizer claims the home side', async () => {
    const app = createApp({body: {...MATCH, teamName: 'Thun'}});

    const stored = await storedSession(app);

    expect(stored?.organizerTeam)
      .toBe('home');
    expect(stored?.status)
      .toBe('Draft');
    expect(stored?.players)
      .toHaveLength(3);
    expect(stored?.players.every((p) => p.teamId === 'home'))
      .toBe(true);
  });

  test('stores organizerTeam "away" when the organizer claims the guest side', async () => {
    const app = createApp({body: {...MATCH, teamName: 'Ostermundigen'}});

    const stored = await storedSession(app);

    expect(stored?.organizerTeam)
      .toBe('away');
    expect(stored?.players)
      .toHaveLength(3);
    expect(stored?.players.every((p) => p.teamId === 'away'))
      .toBe(true);
  });

  test('throws when a required match field is missing', async () => {
    const app = createApp({body: {...MATCH, date: ''}});

    await expect(handleScrapeMatchPost(app))
      .rejects
      .toThrow('Missing required parameter: match');
  });
});