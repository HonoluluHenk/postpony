import { describe, expect, test } from 'vitest';
import { aSession } from '../../../lib/__test-utils__/builders';
import { createApp } from '../../../lib/__test-utils__/create-app';
import { hashPassword } from '../../../lib/crypto-utils';
import { AppError } from '../../../lib/errors';
import { organizerPasswordFromRequest, requireOrganizerCaptain, withOrganizerPassword } from './edit-auth';

const PASSWORD = 'organizer-pw';

describe('organizerPasswordFromRequest', () => {
  test('reads the password from the request query', () => {
    const app = createApp({queries: {organizerPassword: 'abc'}});

    expect(organizerPasswordFromRequest(app))
      .toBe('abc');
  });

  test('falls back to the current URL query when the request has none', () => {
    const app = createApp({headers: {'HX-Current-URL': 'https://game-scheduler.localhost:3000/edit/1?organizerPassword=xyz'}});

    expect(organizerPasswordFromRequest(app))
      .toBe('xyz');
  });

  test('prefers the request query over the current URL', () => {
    const app = createApp({
      queries: {organizerPassword: 'abc'},
      headers: {'HX-Current-URL': 'https://game-scheduler.localhost:3000/edit/1?organizerPassword=xyz'},
    });

    expect(organizerPasswordFromRequest(app))
      .toBe('abc');
  });

  test('returns an empty string when neither source has the password', () => {
    expect(organizerPasswordFromRequest(createApp()))
      .toBe('');
  });

  test('returns an empty string when the current URL is invalid', () => {
    const app = createApp({headers: {'HX-Current-URL': 'not a url'}});

    expect(organizerPasswordFromRequest(app))
      .toBe('');
  });
});

describe('requireOrganizerCaptain', () => {
  test('resolves when the password matches the hash', async () => {
    const session = aSession({organizerCaptainPasswordHash: await hashPassword(PASSWORD)});
    const app = createApp({queries: {organizerPassword: PASSWORD}});

    await expect(requireOrganizerCaptain(app, session))
      .resolves
      .toBeUndefined();
  });

  test('rejects a missing password with a 403', async () => {
    const session = aSession({organizerCaptainPasswordHash: await hashPassword(PASSWORD)});
    const app = createApp();

    const error = await requireOrganizerCaptain(app, session).catch((e: unknown) => e);

    expect(error)
      .toBeInstanceOf(AppError);
    expect((error as AppError).status)
      .toBe(403);
    expect((error as AppError).message)
      .toBe('Invalid organizer password.');
  });

  test('rejects a wrong password with a 403', async () => {
    const session = aSession({organizerCaptainPasswordHash: await hashPassword(PASSWORD)});
    const app = createApp({queries: {organizerPassword: 'wrong'}});

    const error = await requireOrganizerCaptain(app, session).catch((e: unknown) => e);

    expect(error)
      .toBeInstanceOf(AppError);
    expect((error as AppError).status)
      .toBe(403);
  });
});

describe('withOrganizerPassword', () => {
  test('appends the password to a URL without an existing query', () => {
    expect(withOrganizerPassword('/edit/1', 'pw'))
      .toBe('/edit/1?organizerPassword=pw');
  });

  test('appends the password to a URL with an existing query', () => {
    expect(withOrganizerPassword('/edit/1/proposed-date-delete?proposedDateId=pd-1', 'pw'))
      .toBe('/edit/1/proposed-date-delete?proposedDateId=pd-1&organizerPassword=pw');
  });

  test('leaves the URL unchanged when the password is absent', () => {
    expect(withOrganizerPassword('/edit/1', undefined))
      .toBe('/edit/1');
    expect(withOrganizerPassword('/edit/1?sort=date', ''))
      .toBe('/edit/1?sort=date');
  });
});
