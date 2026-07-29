import { describe, expect, test, vi } from 'vitest';
import { App } from '../../app';
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
    get: (key: string): string | undefined => (key === LOCALE_KEY ? 'en' : undefined),
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

describe('handleCreatePost', () => {
  test('creates a session and stores it via the SessionStore', async () => {
    const app = createApp({body: {name: 'Match Reschedule'}});

    const response = await handleCreatePost(app);

    expect(response.status).toBe(302);

    // Read all sessions from the store to verify
    const allSessions = app.store as MemorySessionStore;
    const sessionsMap = (allSessions as any).store as Map<string, any>;
    expect(sessionsMap.size).toBe(1);

    const stored = [...sessionsMap.values()][0];
    expect(stored?.name).toBe('Match Reschedule');
    expect(stored?.status).toBe('Draft');
    expect(stored?.id).toBeDefined();
    expect(stored?.ownerPasswordHash).toBeDefined();
    expect(stored?.invitationPasswordHash).toBeDefined();
    expect(stored?.invitationPassword).toBeDefined();
    expect(stored?.createdAt).toBeDefined();

    const location = response.headers.get('Location') ?? '';
    expect(location).toContain(`/edit/${stored?.id}`);
    expect(location).toContain('ownerPassword=');
  });

  test('returns 400 and re-renders on validation failure', async () => {
    const app = createApp({body: {name: ''}});

    const response = await handleCreatePost(app);

    expect(response.status).toBe(400);
  });

  test('redirects via HX-Redirect header for HTMX partial requests', async () => {
    const app = createApp({headers: {'HX-Request': 'true'}, body: {name: 'HTMX Test'}});

    const response = await handleCreatePost(app);

    expect(response.status).toBe(200);
    expect(app.c.header).toHaveBeenCalledWith('HX-Redirect', expect.stringContaining('/edit/'));
  });
});
