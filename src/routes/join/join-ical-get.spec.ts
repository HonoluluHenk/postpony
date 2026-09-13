import { describe, expect, test } from 'vitest';
import { App } from '../../app';
import { aPlayer, aProposedDate, aSession } from '../../lib/__test-utils__/builders';
import { hashPassword } from '../../lib/crypto-utils';
import { MemorySessionStore } from '../../lib/session-store';
import { LOCALE_KEY } from '../../locales';
import { handleJoinIcalGet } from './join-ical-get';

const TOKEN = 'invitation-pw';

interface MockOptions {
  params?: Record<string, string>;
  queries?: Record<string, string>;
  headers?: Record<string, string>;
}

function createApp(options: MockOptions = {}): App {
  const {params = {}, queries = {}, headers = {}} = options;
  const store = new MemorySessionStore();
  const context = {
    get: (key: string): string | undefined => (key === LOCALE_KEY ? 'en-US' : undefined),
    req: {
      param: (name: string): string | undefined => params[name],
      query: (name: string): string | undefined => queries[name],
      header: (name: string): string | undefined => headers[name],
      url: 'https://game-scheduler.localhost:3000/',
    },
  } as any;

  return App.create(context, store);
}

async function seedSession(
  overrides: Parameters<typeof aSession>[0] = {},
): Promise<ReturnType<typeof aSession>> {
  return aSession({invitationPasswordHash: await hashPassword(TOKEN), ...overrides});
}

describe('handleJoinIcalGet', () => {
  test('throws 404 when the session does not exist', async () => {
    const app = createApp({params: {id: 'missing', team: 'home'}, queries: {token: TOKEN}});

    await expect(handleJoinIcalGet(app))
      .rejects
      .toThrow('Session not found');
  });

  test('throws 403 when the invitation token is wrong', async () => {
    const session = await seedSession();
    const app = createApp({params: {id: session.id, team: 'home'}, queries: {token: 'nope'}});
    await app.store.save(session);

    await expect(handleJoinIcalGet(app))
      .rejects
      .toThrow('Invalid or missing invitation token.');
  });

  test('throws 400 when the team parameter is invalid', async () => {
    const session = await seedSession();
    const app = createApp({params: {id: session.id, team: 'spectators'}, queries: {token: TOKEN}});
    await app.store.save(session);

    await expect(handleJoinIcalGet(app))
      .rejects
      .toThrow('Invalid team. Expected \'home\' or \'away\'.');
  });

  test('returns text/calendar with token only and no playerId required', async () => {
    const session = await seedSession({
      name: 'Thun vs Ostermundigen',
      proposedDates: [aProposedDate()],
    });
    const app = createApp({params: {id: session.id, team: 'home'}, queries: {token: TOKEN}});
    await app.store.save(session);

    const response = await handleJoinIcalGet(app);

    expect(response.status)
      .toBe(200);
    expect(response.headers.get('Content-Type'))
      .toBe('text/calendar; charset=utf-8');
    expect(response.headers.get('Content-Disposition'))
      .toBe('attachment; filename="Thun vs Ostermundigen.ics"');

    const body = await response.text();
    expect(body)
      .toContain('BEGIN:VCALENDAR');
    expect(body)
      .toContain('BEGIN:VEVENT');
  });

  test('embeds playerId in the URL property and every vote link when it matches a participant on the team', async () => {
    const session = await seedSession({
      proposedDates: [aProposedDate({id: 'date-a'})],
      players: [aPlayer({id: 'player-1', teamId: 'home'})],
    });
    const app = createApp({
      params: {id: session.id, team: 'home'},
      queries: {token: TOKEN, playerId: 'player-1'},
    });
    await app.store.save(session);

    const response = await handleJoinIcalGet(app);
    const raw = await response.text();
    const body = raw.replace(/\r\n /g, '');

    expect(response.status)
      .toBe(200);
    expect(body)
      .toContain(`URL:https://game-scheduler.localhost:3000/join/${session.id}/home/vote?token=${TOKEN}&playerId=player-1`);
    expect(body)
      .toContain('playerId=player-1&vote-date-a=Yes');
    expect(body)
      .toContain('playerId=player-1&vote-date-a=IfNecessary');
    expect(body)
      .toContain('playerId=player-1&vote-date-a=No');

    const encoder = new TextEncoder();
    for (const line of raw.split('\r\n')) {
      expect(encoder.encode(line).length)
        .toBeLessThanOrEqual(75);
    }
  });

  test('degrades silently to an unpersonalized file when playerId is absent', async () => {
    const session = await seedSession({
      proposedDates: [aProposedDate({id: 'date-a'})],
      players: [aPlayer({id: 'player-1', teamId: 'home'})],
    });
    const app = createApp({
      params: {id: session.id, team: 'home'},
      queries: {token: TOKEN},
    });
    await app.store.save(session);

    const response = await handleJoinIcalGet(app);
    const body = (await response.text()).replace(/\r\n /g, '');

    expect(response.status)
      .toBe(200);
    expect(body)
      .toContain('vote-date-a=Yes');
    expect(body)
      .not
      .toContain('playerId=');
  });

  test('degrades silently when playerId does not match any participant on the team', async () => {
    const session = await seedSession({
      proposedDates: [aProposedDate({id: 'date-a'})],
      players: [aPlayer({id: 'player-1', teamId: 'home'})],
    });
    const app = createApp({
      params: {id: session.id, team: 'home'},
      queries: {token: TOKEN, playerId: 'ghost'},
    });
    await app.store.save(session);

    const response = await handleJoinIcalGet(app);
    const body = (await response.text()).replace(/\r\n /g, '');

    expect(response.status)
      .toBe(200);
    expect(body)
      .toContain('vote-date-a=Yes');
    expect(body)
      .not
      .toContain('playerId=');
  });

  test('does not personalize a player belonging to the other team', async () => {
    const session = await seedSession({
      proposedDates: [aProposedDate({id: 'date-a'})],
      players: [aPlayer({id: 'away-1', teamId: 'away'})],
    });
    const app = createApp({
      params: {id: session.id, team: 'home'},
      queries: {token: TOKEN, playerId: 'away-1'},
    });
    await app.store.save(session);

    const response = await handleJoinIcalGet(app);
    const body = (await response.text()).replace(/\r\n /g, '');

    expect(response.status)
      .toBe(200);
    expect(body)
      .not
      .toContain('playerId=away-1');
  });
});
