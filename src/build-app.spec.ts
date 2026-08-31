import { describe, expect, it } from 'vitest';
import { buildApp } from './build-app';
import { MemorySessionStore, type SessionStore } from './lib/session-store';

type TestApp = ReturnType<typeof buildApp>;

function newApp(): TestApp {
  return buildApp(new MemorySessionStore());
}

class RecordingStore implements SessionStore {
  getCalled = false;

  get(): Promise<undefined> {
    this.getCalled = true;
    return Promise.resolve(undefined);
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function -- mock impl
  async migrate(): Promise<void> {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function -- mock impl
  async save(): Promise<void> {}
}

describe('buildApp seam', () => {
  it('wires the home route and returns HTML', async () => {
    const app = newApp();

    const res = await app.request('/', {headers: {Accept: 'text/html'}});

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
  });

  it('wires the scrape-creation route and not the manual create route', async () => {
    const app = newApp();

    const scrape = await app.request('/create/scrape', {headers: {Accept: 'text/html'}});
    expect(scrape.status).toBe(200);

    const manual = await app.request('/create', {headers: {Accept: 'text/html'}});
    expect(manual.status).toBe(404);
  });

  it('returns 404 for an unknown edit session', async () => {
    const app = newApp();

    const res = await app.request('/edit/does-not-exist');

    expect(res.status).toBe(404);
  });

  it('injects the session store into the request context', async () => {
    const store = new RecordingStore();
    const app = buildApp(store);

    const res = await app.request('/edit/whatever');

    // 404 because the recording store holds no session, but the handler must
    // have consulted the injected instance — not a default one.
    expect(res.status).toBe(404);
    expect(store.getCalled).toBe(true);
  });
});
