import { describe, expect, test, vi } from 'vitest';
import { App } from '../../../app';
import { aPlayer, aProposedDate, aSession } from '../../../lib/__test-utils__/builders';
import { LOCALE_KEY } from '../../../locales';
import { MemorySessionStore } from '../../../lib/session-store';
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
  const store = new MemorySessionStore();
  const context = {
    get: (key: string): string | undefined => (key === LOCALE_KEY ? 'en' : undefined),
    req: {
      param: (name: string): string | undefined => params[name],
      query: (name: string): string | undefined => queries[name],
      header: (name: string): string | undefined => headers[name],
      parseBody: (): Promise<Record<string, unknown>> => Promise.resolve(body),
      url: 'https://game-scheduler.localhost:3000/',
    },
    html: vi.fn((content: string, init?: ResponseInit) => new Response(content, init)),
    redirect: vi.fn((url: string) => new Response(null, {status: 302, headers: {Location: url}})),
  } as any;

  return App.create(context, store);
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
      await app.store.save(session);

      await handleEditPlayersPost(app);

      const stored = await app.store.get(session.id);
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
      await app.store.save(session);

      await handleEditPlayersPost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.players)
        .toHaveLength(2);
      expect(stored?.players[1]?.name)
        .toBe('Bob');
    });

    test('redirects without adding a player when the name is missing', async () => {
      const session = aSession();
      const app = createApp({params: {id: session.id}, body: {}});
      await app.store.save(session);

      const response = await handleEditPlayersPost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.players)
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
      await app.store.save(session);

      await handleEditProposedDatesPost(app);

      const stored = await app.store.get(session.id);
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

    test('accepts an ISO-8601 space separator and normalizes it to T on save', async () => {
      const session = aSession();
      const app = createApp({params: {id: session.id}, body: {proposedDateTime: '2025-09-01 20:00'}});
      await app.store.save(session);

      await handleEditProposedDatesPost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.proposedDates)
        .toHaveLength(1);
      expect(stored?.proposedDates[0]?.dateTimeRange.start.toString())
        .toBe('2025-09-01T20:00:00');
    });

    test('appends to the existing proposed dates', async () => {
      const session = aSession({proposedDates: [aProposedDate()]});
      const app = createApp({params: {id: session.id}, body: {proposedDateTime: '2025-09-02T18:30'}});
      await app.store.save(session);

      await handleEditProposedDatesPost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.proposedDates)
        .toHaveLength(2);
    });

    test('redirects without adding when the datetime is invalid', async () => {
      const session = aSession();
      const app = createApp({params: {id: session.id}, body: {proposedDateTime: 'not-a-date'}});
      await app.store.save(session);

      const response = await handleEditProposedDatesPost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.proposedDates)
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
      await app.store.save(session);

      await handleEditVenuePost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.maxOverlaps)
        .toBe(3);
    });

    test('clears maxOverlaps when the field is empty', async () => {
      const session = aSession({maxOverlaps: 5});
      const app = createApp({params: {id: session.id}, body: {maxOverlaps: ''}});
      await app.store.save(session);

      await handleEditVenuePost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.maxOverlaps)
        .toBeUndefined();
    });
  });

  describe('partial (HX-Request) fragment rendering', () => {
    const partialHeaders = {'HX-Request': 'true'};

    test('players: renders the team section with an empty error-container on success', async () => {
      const session = aSession();
      const app = createApp({
        params: {id: session.id},
        headers: partialHeaders,
        body: {playerName: 'Alice'},
      });
      await app.store.save(session);

      const html = await (await handleEditPlayersPost(app)).text();

      expect(html)
        .toContain('<section id="team-management"');
      expect(html)
        .toContain('Alice');
      expect(html)
        .toContain('id="error-container" hx-swap-oob="true"');
      expect(html)
        .not
        .toContain('error padding white-text');
    });

    test('players: renders the error-container and keeps the invalid input on failure', async () => {
      const session = aSession();
      const app = createApp({params: {id: session.id}, headers: partialHeaders, body: {playerName: ''}});
      await app.store.save(session);

      const response = await handleEditPlayersPost(app);
      const html = await response.text();

      expect(response.status)
        .toBe(400);
      expect(html)
        .toContain('id="error-container" hx-swap-oob="true"');
      expect(html)
        .toContain('Player name is required');
      expect(html)
        .toContain('invalid');
    });

    test('proposed dates: renders the section and a success toast on success', async () => {
      const session = aSession();
      const app = createApp({
        params: {id: session.id},
        headers: partialHeaders,
        body: {proposedDateTime: '2025-09-01T20:00'},
      });
      await app.store.save(session);

      const html = await (await handleEditProposedDatesPost(app)).text();

      expect(html)
        .toContain('<section id="proposed-dates-management"');
      expect(html)
        .toContain('toast success');
    });

    test('proposed dates: renders the error-container on an invalid datetime', async () => {
      const session = aSession();
      const app = createApp({
        params: {id: session.id},
        headers: partialHeaders,
        body: {proposedDateTime: 'not-a-date'},
      });
      await app.store.save(session);

      const response = await handleEditProposedDatesPost(app);
      const html = await response.text();

      expect(response.status)
        .toBe(400);
      expect(html)
        .toContain('id="error-container" hx-swap-oob="true"');
      expect(html)
        .toContain('invalid');
    });

    test('venue: renders the section with the stored value and a success toast', async () => {
      const session = aSession();
      const app = createApp({
        params: {id: session.id},
        headers: partialHeaders,
        body: {maxOverlaps: '3'},
      });
      await app.store.save(session);

      const html = await (await handleEditVenuePost(app)).text();

      expect(html)
        .toContain('<section id="venue-management"');
      expect(html)
        .toContain('value="3"');
      expect(html)
        .toContain('toast success');
    });

    test('venue: renders the error-container and keeps the value on failure', async () => {
      const session = aSession();
      const app = createApp({
        params: {id: session.id},
        headers: partialHeaders,
        body: {maxOverlaps: '-1'},
      });
      await app.store.save(session);

      const response = await handleEditVenuePost(app);
      const html = await response.text();

      expect(response.status)
        .toBe(400);
      expect(html)
        .toContain('id="error-container" hx-swap-oob="true"');
      expect(html)
        .toContain('value="-1"');
      expect(html)
        .toContain('invalid');
    });
  });

});
