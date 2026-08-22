import { describe, expect, test, vi } from 'vitest';
import { App } from '../../app';
import { aSession } from '../../lib/__test-utils__/builders';
import { hashPassword } from '../../lib/crypto-utils';
import { MemorySessionStore } from '../../lib/session-store';
import { LOCALE_KEY } from '../../locales';
import { handleCreateGet } from './create-get';

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

describe('handleCreateGet', () => {
  test('renders the mint form by default', async () => {
    const app = createApp();

    const response = await handleCreateGet(app);
    const html = await response.text();

    expect(html).toContain('Create a New Postponement');
    expect(html).not.toContain('Save changes');
  });

  describe('change mode', () => {
    const ownerPassword = 'owner-secret';

    test('renders the change form prefilled with the session match details', async () => {
      const session = aSession({
        ownerPasswordHash: hashPassword(ownerPassword),
        homeTeam: 'Thun',
        guestTeam: 'Ostermundigen',
        originalMatchDateTime: '2026-08-29T16:00',
      });
      const app = createApp({queries: {sessionId: session.id, ownerPassword}});
      await app.store.save(session);

      const response = await handleCreateGet(app);
      const html = await response.text();

      expect(html).toContain('Change Match Details');
      expect(html).toContain('value="Thun"');
      expect(html).toContain('value="Ostermundigen"');
      expect(html).toContain('value="08/29/2026 04:00 pm"');
      expect(html).toContain('Save changes');
      expect(html).toContain(`name="sessionId" value="${session.id}"`);
      expect(html).toContain(`name="ownerPassword" value="${ownerPassword}"`);
    });

    test('rejects an invalid owner password', async () => {
      const session = aSession({ownerPasswordHash: hashPassword('real-pw')});
      const app = createApp({queries: {sessionId: session.id, ownerPassword: 'wrong'}});
      await app.store.save(session);

      await expect(handleCreateGet(app))
        .rejects
        .toThrow('Invalid owner password.');
    });
  });
});
