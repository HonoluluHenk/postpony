import { describe, expect, test } from 'vitest';
import { App } from '../../../app';
import { aProposedDate, aSession } from '../../../lib/__test-utils__/builders';
import { MemorySessionStore } from '../../../lib/session-store';
import { LOCALE_KEY } from '../../../locales';
import { handleEditIcalGet } from './ical-get';

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

describe('handleEditIcalGet', () => {
  test('throws 404 when the session does not exist', async () => {
    const app = createApp({params: {id: 'missing'}});

    await expect(handleEditIcalGet(app))
      .rejects
      .toThrow('Session not found');
  });

  test('returns text/calendar as an attachment with a .ics filename and one VEVENT per votable date', async () => {
    const session = aSession({
      name: 'Thun vs Ostermundigen',
      status: 'Voting',
      proposedDates: [
        aProposedDate({id: 'pd-1'}),
        aProposedDate({id: 'pd-closed', votable: false}),
      ],
    });
    const app = createApp({params: {id: session.id}});
    await app.store.save(session);

    const response = await handleEditIcalGet(app);

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
    expect(body)
      .toContain('UID:pd-1@postpony');
    expect(body)
      .not
      .toContain('UID:pd-closed@postpony');
  });

  test('does not require a password and marks the locked date CONFIRMED', async () => {
    const session = aSession({
      status: 'Confirmed',
      confirmedProposedDateId: 'pd-confirmed',
      proposedDates: [aProposedDate({id: 'pd-confirmed'})],
    });
    const app = createApp({params: {id: session.id}});
    await app.store.save(session);

    const response = await handleEditIcalGet(app);

    expect(response.status)
      .toBe(200);
    const body = await response.text();
    expect(body)
      .toContain('UID:pd-confirmed@postpony');
    expect(body)
      .toContain('STATUS:CONFIRMED');
  });
});
