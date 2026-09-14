import { describe, expect, test } from 'vitest';
import { aProposedDate, aSession } from '../../../lib/__test-utils__/builders';
import { createApp } from '../../../lib/__test-utils__/create-app';
import { handleEditIcalGet } from './ical-get';

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
    expect(body)
      .toContain('X-ALT-DESC;FMTTYPE=text/html:');
    expect(body)
      .toContain(`>Open the postponement</a>`);
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

  test('stays tokenless and carries no vote links or URL property (edit export unchanged)', async () => {
    const session = aSession({
      status: 'Voting',
      proposedDates: [aProposedDate({id: 'pd-1'})],
    });
    const app = createApp({params: {id: session.id}});
    await app.store.save(session);

    const response = await handleEditIcalGet(app);
    const body = await response.text();

    expect(body)
      .toContain('UID:pd-1@postpony');
    expect(body)
      .not
      .toContain('URL:');
    expect(body)
      .not
      .toContain('vote-');
  });
});
