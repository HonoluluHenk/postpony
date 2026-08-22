import { describe, expect, test, vi } from 'vitest';
import { App } from '../../app';
import { aPlayer, aProposedDate, aSession, aVote } from '../../lib/__test-utils__/builders';
import { hashPassword } from '../../lib/crypto-utils';
import { MemorySessionStore } from '../../lib/session-store';
import { LOCALE_KEY } from '../../locales';
import { handleCreatePost } from './create-post';

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
      param: (): string | undefined => undefined,
      query: (): string | undefined => undefined,
      header: (name: string): string | undefined => headers[name],
      parseBody: (): Promise<Record<string, unknown>> => Promise.resolve(body),
      url: 'https://game-scheduler.localhost:3000/',
    },
    html: vi.fn((content: string, init?: ResponseInit) => new Response(content, init)),
    text: vi.fn((body: string, _init?: ResponseInit) => new Response(body)),
    redirect: vi.fn((url: string) => new Response(null, {status: 302, headers: {Location: url}})),
    header: vi.fn(),
  } as any;

  return App.create(context, store);
}

const MATCH = {
  homeTeam: 'Thun',
  guestTeam: 'Ostermundigen',
  originalMatchDateTime: '08/29/2026 04:00 pm',
};

describe('handleCreatePost', () => {
  test('creates a Draft session with typed match details and a derived name', async () => {
    const app = createApp({body: MATCH});

    const response = await handleCreatePost(app);

    expect(response.status).toBe(302);

    const allSessions = app.store as MemorySessionStore;
    const sessionsMap = (allSessions as any).store as Map<string, any>;
    expect(sessionsMap.size).toBe(1);

    const stored = [...sessionsMap.values()][0];
    expect(stored?.name).toBe('Thun vs Ostermundigen – 08/29/2026 04:00 pm');
    expect(stored?.homeTeam).toBe('Thun');
    expect(stored?.guestTeam).toBe('Ostermundigen');
    expect(stored?.originalMatchDateTime).toBe('2026-08-29T16:00');
    expect(stored?.status).toBe('Draft');
    expect(stored?.organizerTeam).toBe('home');
    expect(stored?.reopenCount).toBe(0);
    expect(stored?.id).toBeDefined();
    expect(stored?.ownerPasswordHash).toBeDefined();
    expect(stored?.invitationPasswordHash).toBeDefined();
    expect(stored?.invitationPassword).toBeDefined();
    expect(stored?.createdAt).toBeDefined();

    const location = response.headers.get('Location') ?? '';
    expect(location).toContain(`/edit/${stored?.id}`);
    expect(location).toContain('ownerPassword=');
  });

  test('returns 400 and re-renders when match details are missing', async () => {
    const app = createApp({body: {homeTeam: '', guestTeam: '', originalMatchDateTime: ''}});

    const response = await handleCreatePost(app);

    expect(response.status).toBe(400);
    const html = await response.text();
    expect(html).toContain('Home team is required');
    expect(html).toContain('Guest team is required');
    expect(html).toContain('error');
  });

  test('returns 400 when the original match datetime is not parseable', async () => {
    const app = createApp({body: {...MATCH, originalMatchDateTime: 'not-a-date'}});

    const response = await handleCreatePost(app);

    expect(response.status).toBe(400);
    const html = await response.text();
    expect(html).toContain('Please provide a valid date and time for the original match');
  });

  test('redirects via HX-Redirect header for HTMX partial requests', async () => {
    const app = createApp({headers: {'HX-Request': 'true'}, body: MATCH});

    const response = await handleCreatePost(app);

    expect(response.status).toBe(200);
    expect(app.c.header).toHaveBeenCalledWith('HX-Redirect', expect.stringContaining('/edit/'));
  });
});

describe('handleCreatePost change mode', () => {
  const ownerPassword = 'owner-secret';

  test('mutates the session in place, preserving id, passwords, votes, proposed dates, and players', async () => {
    const session = aSession({
      ownerPasswordHash: hashPassword(ownerPassword),
      organizerTeam: 'away',
      players: [aPlayer({id: 'p1', name: 'Keep Me'})],
      proposedDates: [aProposedDate()],
      votes: [aVote()],
      metadata: {source: 'click-tt.ch', league: 'Old League'},
    });
    const app = createApp({body: {...MATCH, sessionId: session.id, ownerPassword}});
    await app.store.save(session);

    const response = await handleCreatePost(app);

    expect(response.status).toBe(302);
    const location = response.headers.get('Location') ?? '';
    expect(location).toContain(`/edit/${session.id}`);
    expect(location).toContain(ownerPassword);

    const stored = await app.store.get(session.id);
    expect(stored?.id).toBe(session.id);
    expect(stored?.ownerPasswordHash).toBe(session.ownerPasswordHash);
    expect(stored?.invitationPasswordHash).toBe(session.invitationPasswordHash);
    expect(stored?.invitationPassword).toBe(session.invitationPassword);
    expect(stored?.homeTeam).toBe('Thun');
    expect(stored?.guestTeam).toBe('Ostermundigen');
    expect(stored?.originalMatchDateTime).toBe('2026-08-29T16:00');
    expect(stored?.name).toBe('Thun vs Ostermundigen – 08/29/2026 04:00 pm');
    expect(stored?.organizerTeam).toBe('away');
    expect(stored?.players).toEqual(session.players);
    expect(stored?.proposedDates).toEqual(session.proposedDates);
    expect(stored?.votes).toEqual(session.votes);
    // The scrape-only provenance no longer applies to a hand-entered match.
    expect(stored?.metadata).toBeUndefined();

    // No new session is minted.
    const storeMap = (app.store as MemorySessionStore as any).store as Map<string, unknown>;
    expect(storeMap.size).toBe(1);
  });

  test('rejects a wrong owner password', async () => {
    const session = aSession({ownerPasswordHash: hashPassword('real-pw')});
    const app = createApp({body: {...MATCH, sessionId: session.id, ownerPassword: 'wrong-pw'}});
    await app.store.save(session);

    await expect(handleCreatePost(app))
      .rejects
      .toThrow('Invalid owner password.');
  });

  test('rejects a missing owner password', async () => {
    const session = aSession();
    const app = createApp({body: {...MATCH, sessionId: session.id}});
    await app.store.save(session);

    await expect(handleCreatePost(app))
      .rejects
      .toThrow('Invalid owner password.');
  });

  test('throws when the session does not exist', async () => {
    const app = createApp({body: {...MATCH, sessionId: 'missing', ownerPassword}});

    await expect(handleCreatePost(app))
      .rejects
      .toThrow('Session not found');
  });
});
