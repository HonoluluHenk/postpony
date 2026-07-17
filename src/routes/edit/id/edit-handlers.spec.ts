import { describe, expect, test, vi } from 'vitest';
import { App } from '../../../app';
import { aPlayer, aProposedDate, aSession } from '../../../lib/__test-utils__/builders';
import { LOCALE_KEY } from '../../../locales';
import { handleEditPlayersPost } from './players-post';
import { handleEditProposedDatesPost } from './proposed-dates-post';
import { handleEditVenuePost } from './venue-post';

interface MockOptions {
  params?: Record<string, string>;
  queries?: Record<string, string>;
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
}

function createApp(options: MockOptions = {}): App {
  const {params = {}, queries = {}, headers = {}, body = {}} = options;
  const context = {
    get: (key: string): string | undefined => (key === LOCALE_KEY ? 'en' : undefined),
    req: {
      param: (name: string): string | undefined => params[name],
      query: (name: string): string | undefined => queries[name],
      header: (name: string): string | undefined => headers[name],
      parseBody: (): Promise<Record<string, unknown>> => Promise.resolve(body),
      url: 'https://game-scheduler.localhost:3000/',
    },
    html: vi.fn((content: string) => new Response(content)),
    redirect: vi.fn((url: string) => new Response(null, {status: 302, headers: {Location: url}})),
  } as any;

  return App.create(context);
}

describe('edit handlers', () => {

  describe('handleEditPlayersPost', () => {
    test('throws when the session does not exist', async () => {
      const app = createApp({params: {id: 'missing'}});

      await expect(handleEditPlayersPost(app))
        .rejects
        .toThrow('Session not found');
    });

    test('adds a player to a session that has none', async () => {
      const session = aSession();
      const app = createApp({params: {id: session.id}, body: {playerName: 'Alice'}});
      app.sessions[session.id] = session;

      await handleEditPlayersPost(app);

      const stored = app.sessions[session.id];
      expect(stored?.players)
        .toHaveLength(1);
      expect(stored?.players[0]?.name)
        .toBe('Alice');
      expect(stored?.players[0]?.teamId)
        .toBe('home');
    });

    test('appends to the existing players', async () => {
      const session = aSession({players: [aPlayer()]});
      const app = createApp({params: {id: session.id}, body: {playerName: 'Bob'}});
      app.sessions[session.id] = session;

      await handleEditPlayersPost(app);

      const stored = app.sessions[session.id];
      expect(stored?.players)
        .toHaveLength(2);
      expect(stored?.players[1]?.name)
        .toBe('Bob');
    });

    test('redirects without adding a player when the name is missing', async () => {
      const session = aSession();
      const app = createApp({params: {id: session.id}, body: {}});
      app.sessions[session.id] = session;

      const response = await handleEditPlayersPost(app);

      expect(app.sessions[session.id]?.players)
        .toHaveLength(0);
      expect(response.status)
        .toBe(302);
    });
  });

  describe('handleEditProposedDatesPost', () => {
    test('throws when the session does not exist', async () => {
      const app = createApp({params: {id: 'missing'}});

      await expect(handleEditProposedDatesPost(app))
        .rejects
        .toThrow('Session not found');
    });

    test('adds a proposed date to the session', async () => {
      const session = aSession();
      const app = createApp({params: {id: session.id}, body: {proposedDateTime: '2025-09-01T20:00'}});
      app.sessions[session.id] = session;

      await handleEditProposedDatesPost(app);

      const stored = app.sessions[session.id];
      expect(stored?.proposedDates)
        .toHaveLength(1);
      const proposedDate = stored?.proposedDates[0];
      expect(proposedDate?.sessionId)
        .toBe(session.id);
      expect(proposedDate?.proposerId)
        .toBe('owner');
      expect(proposedDate?.dateTimeRange.start)
        .toBe(proposedDate?.dateTimeRange.end);
    });

    test('appends to the existing proposed dates', async () => {
      const session = aSession({proposedDates: [aProposedDate()]});
      const app = createApp({params: {id: session.id}, body: {proposedDateTime: '2025-09-02T18:30'}});
      app.sessions[session.id] = session;

      await handleEditProposedDatesPost(app);

      expect(app.sessions[session.id]?.proposedDates)
        .toHaveLength(2);
    });

    test('redirects without adding when the datetime is invalid', async () => {
      const session = aSession();
      const app = createApp({params: {id: session.id}, body: {proposedDateTime: 'not-a-date'}});
      app.sessions[session.id] = session;

      const response = await handleEditProposedDatesPost(app);

      expect(app.sessions[session.id]?.proposedDates)
        .toHaveLength(0);
      expect(response.status)
        .toBe(302);
    });
  });

  describe('handleEditVenuePost', () => {
    test('throws when the session does not exist', async () => {
      const app = createApp({params: {id: 'missing'}});

      await expect(handleEditVenuePost(app))
        .rejects
        .toThrow('Session not found');
    });

    test('sets maxOverlaps on the session', async () => {
      const session = aSession();
      const app = createApp({params: {id: session.id}, body: {maxOverlaps: '3'}});
      app.sessions[session.id] = session;

      await handleEditVenuePost(app);

      expect(app.sessions[session.id]?.maxOverlaps)
        .toBe(3);
    });

    test('clears maxOverlaps when the field is empty', async () => {
      const session = aSession({maxOverlaps: 5});
      const app = createApp({params: {id: session.id}, body: {maxOverlaps: ''}});
      app.sessions[session.id] = session;

      await handleEditVenuePost(app);

      expect(app.sessions[session.id]?.maxOverlaps)
        .toBeUndefined();
    });
  });

});
