import { describe, expect, test, vi } from 'vitest';
import type { App } from '../../app';
import { aSession } from '../../lib/__test-utils__/builders';
import { createApp, type MockOptions } from '../../lib/__test-utils__/create-app';
import { hashPassword } from '../../lib/crypto-utils';
import { AppError } from '../../lib/errors';
import type { Postponement } from '../../lib/models';
import { runOpponentCommand } from './run-opponent-command';

const OPPONENT_PASSWORD = 'opponent-captain-pw';
const opponentPasswordHash = await hashPassword(OPPONENT_PASSWORD);

function seedSession(overrides: Parameters<typeof aSession>[0] = {}): Postponement {
  return aSession({opponentCaptainPasswordHash: opponentPasswordHash, ...overrides});
}

function opponentApp(options: MockOptions = {}): App {
  return createApp({
    ...options,
    queries: {...options.queries, opponentCaptainPassword: OPPONENT_PASSWORD},
  });
}

async function expectForbidden(promise: Promise<Response>): Promise<void> {
  const error = await promise.catch((e: unknown) => e);
  expect(error)
    .toBeInstanceOf(AppError);
  expect((error as AppError).status)
    .toBe(403);
  expect((error as AppError).message)
    .toBe('Invalid opponent captain password.');
}

describe('runOpponentCommand', () => {
  test('throws the localized not-found error when the session does not exist', async () => {
    const app = opponentApp({params: {id: 'missing'}});

    await expect(runOpponentCommand(app, {apply: (rules, session) => rules.reopen(session)}))
      .rejects
      .toThrow('Session not found');
  });

  test('throws a 403 when the opponent-captain password is missing', async () => {
    const session = seedSession();
    const app = createApp({params: {id: session.id}});
    await app.store.save(session);

    await expectForbidden(runOpponentCommand(app, {apply: (rules, current) => rules.reopen(current)}));
  });

  test('saves a changed session once and renders the partial with the message', async () => {
    const session = seedSession();
    const app = opponentApp({params: {id: session.id}, headers: {'HX-Request': 'true'}});
    await app.store.save(session);
    const saveSpy = vi.spyOn(app.store, 'save');

    const html = await (await runOpponentCommand(app, {
      apply: (rules, current) => rules.reopen(current),
      message: app.t('postponement_reopened'),
    })).text();

    expect(saveSpy)
      .toHaveBeenCalledTimes(1);
    expect(html)
      .toContain('<p id="clipboard-status" class="visually-hidden" role="status" hx-swap-oob="true">Postponement reopened</p>');
  });

  test('does not save when the operation returns the unchanged session', async () => {
    const session = seedSession();
    const app = opponentApp({params: {id: session.id}, headers: {'HX-Request': 'true'}});
    await app.store.save(session);
    const saveSpy = vi.spyOn(app.store, 'save');

    await runOpponentCommand(app, {apply: (_rules, current) => current});

    expect(saveSpy)
      .not
      .toHaveBeenCalled();
  });

  test('redirects to the opponent page with the password when not partial', async () => {
    const session = seedSession();
    const app = opponentApp({params: {id: session.id}});
    await app.store.save(session);

    const response = await runOpponentCommand(app, {
      apply: (rules, current) => rules.reopen(current),
    });

    expect(response.status)
      .toBe(302);
    expect(response.headers.get('location'))
      .toBe(`/opponent/${session.id}?opponentCaptainPassword=${OPPONENT_PASSWORD}`);
  });

  test('honours an explicit redirect target', async () => {
    const session = seedSession();
    const app = opponentApp({params: {id: session.id}});
    await app.store.save(session);

    const response = await runOpponentCommand(app, {
      apply: (rules, current) => rules.reopen(current),
      redirectTo: `/opponent/${session.id}`,
    });

    expect(response.headers.get('location'))
      .toBe(`/opponent/${session.id}`);
  });

  test('derives the message from the updated session', async () => {
    const session = seedSession({reopenCount: 0});
    const app = opponentApp({params: {id: session.id}, headers: {'HX-Request': 'true'}});
    await app.store.save(session);

    const html = await (await runOpponentCommand(app, {
      apply: (rules, current) => rules.reopen(current),
      message: (updated) => `reopened ${updated.reopenCount}`,
    })).text();

    expect(html)
      .toContain('reopened 1');
  });

  test('merges render extras into the re-render', async () => {
    const session = seedSession();
    const app = opponentApp({params: {id: session.id}, headers: {'HX-Request': 'true'}});
    await app.store.save(session);

    const html = await (await runOpponentCommand(app, {
      apply: (rules, current) => rules.reopen(current),
      extras: {playerError: 'invalid player'},
    })).text();

    expect(html)
      .toContain('invalid player');
    expect(html)
      .toContain('role="alert"');
  });

  test('derives render extras from the updated session', async () => {
    const session = seedSession();
    const app = opponentApp({params: {id: session.id}, headers: {'HX-Request': 'true'}});
    await app.store.save(session);

    const html = await (await runOpponentCommand(app, {
      apply: (rules, current) => rules.reopen(current),
      extras: (updated) => ({playerError: `reopened ${updated.reopenCount}`}),
    })).text();

    expect(html)
      .toContain('reopened 1');
  });

  test('returns an escape-hatch response verbatim without saving', async () => {
    const session = seedSession();
    const app = opponentApp({params: {id: session.id}, headers: {'HX-Request': 'true'}});
    await app.store.save(session);
    const saveSpy = vi.spyOn(app.store, 'save');
    const escape = new Response('custom', {status: 400});

    const response = await runOpponentCommand(app, {apply: () => escape});

    expect(response)
      .toBe(escape);
    expect(saveSpy)
      .not
      .toHaveBeenCalled();
  });

  test('renders instead of redirecting when alwaysRender is set', async () => {
    const session = seedSession();
    const app = opponentApp({params: {id: session.id}});
    await app.store.save(session);

    const response = await runOpponentCommand(app, {
      apply: (rules, current) => rules.reopen(current),
      message: app.t('postponement_reopened'),
      alwaysRender: true,
    });

    expect(response.status)
      .toBe(200);
    expect(response.headers.get('location'))
      .toBeNull();
  });
});
