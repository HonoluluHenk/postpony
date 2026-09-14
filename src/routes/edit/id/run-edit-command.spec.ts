import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { App } from '../../../app';
import { aProposedDate, aSession } from '../../../lib/__test-utils__/builders';
import type { Postponement } from '../../../lib/models';
import * as temporalUtils from '../../../lib/temporal-utils';
import { createApp } from '../../../lib/__test-utils__/create-app';
import { handleConfirmDatePost } from './confirm-date-post';
import { handleEditPlayersPost } from './players-post';
import { handleProposedDateDeletePost } from './proposed-date-delete-post';
import { handleProposedDateVisibilityPost } from './proposed-date-visibility-post';
import { handleEditProposedDatesPost } from './proposed-dates-post';
import { handleRefreshClashesPost } from './refresh-clashes-post';
import { handleReopenPost } from './reopen-post';
import { runEditCommand } from './run-edit-command';

const FIXED_TODAY_ISO = '2026-08-25T08:00';

function occurrenceCount(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

describe('runEditCommand', () => {
  beforeEach(() => {
    vi.spyOn(temporalUtils, 'nowPlainDateTimeIso').mockReturnValue(FIXED_TODAY_ISO);
  });

  test('throws the localized not-found error when the session does not exist', async () => {
    const app = createApp({params: {id: 'missing'}});

    await expect(runEditCommand(app, {apply: (rules, session) => rules.reopen(session)}))
      .rejects
      .toThrow('Session not found');
  });

  test('saves a changed session once and renders the partial with the message', async () => {
    const session = aSession();
    const app = createApp({params: {id: session.id}, headers: {'HX-Request': 'true'}});
    await app.store.save(session);
    const saveSpy = vi.spyOn(app.store, 'save');

    const html = await (await runEditCommand(app, {
      apply: (rules, current) => rules.reopen(current),
      message: app.t('postponement_reopened'),
    })).text();

    expect(saveSpy)
      .toHaveBeenCalledTimes(1);
    expect(html)
      .toContain('<p id="clipboard-status" class="visually-hidden" role="status" hx-swap-oob="true">Postponement reopened</p>');
  });

  test('does not save when the operation returns the unchanged session', async () => {
    const session = aSession();
    const app = createApp({params: {id: session.id}, headers: {'HX-Request': 'true'}});
    await app.store.save(session);
    const saveSpy = vi.spyOn(app.store, 'save');

    await runEditCommand(app, {apply: (_rules, current) => current});

    expect(saveSpy)
      .not
      .toHaveBeenCalled();
  });

  test('redirects to the edit page with the organizer password when not partial', async () => {
    const session = aSession();
    const app = createApp({params: {id: session.id}, queries: {organizerPassword: 'secret'}});
    await app.store.save(session);

    const response = await runEditCommand(app, {
      apply: (rules, current) => rules.reopen(current),
    });

    expect(response.status)
      .toBe(302);
    expect(response.headers.get('location'))
      .toBe(`/edit/${session.id}?organizerPassword=secret`);
  });

  test('honours an explicit redirect target', async () => {
    const session = aSession();
    const app = createApp({params: {id: session.id}});
    await app.store.save(session);

    const response = await runEditCommand(app, {
      apply: (rules, current) => rules.reopen(current),
      redirectTo: `/edit/${session.id}`,
    });

    expect(response.headers.get('location'))
      .toBe(`/edit/${session.id}`);
  });

  test('derives the message from the updated session', async () => {
    const session = aSession({reopenCount: 0});
    const app = createApp({params: {id: session.id}, headers: {'HX-Request': 'true'}});
    await app.store.save(session);

    const html = await (await runEditCommand(app, {
      apply: (rules, current) => rules.reopen(current),
      message: (updated) => `reopened ${updated.reopenCount}`,
    })).text();

    expect(html)
      .toContain('reopened 1');
  });

  test('merges render extras into the re-render', async () => {
    const session = aSession({proposedDates: [aProposedDate()]});
    const app = createApp({params: {id: session.id}, headers: {'HX-Request': 'true'}});
    await app.store.save(session);

    const html = await (await runEditCommand(app, {
      apply: (rules, current) => rules.reopen(current),
      message: app.t('postponement_reopened'),
      extras: {confirmClashWarning: true},
    })).text();

    expect(html)
      .toContain('id="clipboard-status"');
    expect(html)
      .toContain('confirm-clash-warning');
  });

  test('returns an escape-hatch response verbatim without saving', async () => {
    const session = aSession();
    const app = createApp({params: {id: session.id}, headers: {'HX-Request': 'true'}});
    await app.store.save(session);
    const saveSpy = vi.spyOn(app.store, 'save');
    const escape = new Response('custom', {status: 400});

    const response = await runEditCommand(app, {apply: () => escape});

    expect(response)
      .toBe(escape);
    expect(saveSpy)
      .not
      .toHaveBeenCalled();
  });

  test('renders instead of redirecting when alwaysRender is set', async () => {
    const session = aSession();
    const app = createApp({params: {id: session.id}});
    await app.store.save(session);

    const response = await runEditCommand(app, {
      apply: (rules, current) => rules.reopen(current),
      message: app.t('postponement_reopened'),
      alwaysRender: true,
    });

    expect(response.status)
      .toBe(200);
    expect(response.headers.get('location'))
      .toBeNull();
  });

  test('passes the rules object the operation mutates', async () => {
    const session = aSession();
    const app = createApp({params: {id: session.id}, headers: {'HX-Request': 'true'}});
    await app.store.save(session);
    const apply = vi.fn((_rules, current: Postponement) => current);

    await runEditCommand(app, {apply});

    expect(apply)
      .toHaveBeenCalledWith(expect.objectContaining({reopen: expect.any(Function)}), session);
  });

  test('does not save when a message function is the only derived field', async () => {
    const session = aSession();
    const app = createApp({params: {id: session.id}, headers: {'HX-Request': 'true'}});
    await app.store.save(session);
    const saveSpy = vi.spyOn(app.store, 'save');

    await runEditCommand(app, {
      apply: (_rules, current) => current,
      message: () => 'unchanged',
    });

    expect(saveSpy)
      .not
      .toHaveBeenCalled();
  });

  // The visibility toggle is the one edit POST that answers a plain request
  // with the full page rather than a redirect (the seam's `alwaysRender`).
  test('renders the full page for the visibility toggle without an HTMX request', async () => {
    const session = aSession({status: 'Voting', proposedDates: [aProposedDate({id: 'pd-1', votable: false})]});
    const app = createApp({params: {id: session.id}, queries: {proposedDateId: 'pd-1', votable: 'true'}});
    await app.store.save(session);

    const response = await handleProposedDateVisibilityPost(app);

    expect(response.status)
      .toBe(200);
    expect(response.headers.get('location'))
      .toBeNull();
  });
});

interface PipelineCase {
  name: string;
  handler: (app: App) => Promise<Response>;
  session: () => Postponement;
  queries?: Record<string, string>;
  body?: Record<string, unknown>;
  message: string;
  redirectLocation: (id: string) => string;
  /** Whether the operation changes the session (the seam's save-when-changed). */
  saves?: boolean;
}

const pipelineCases: PipelineCase[] = [
  {
    name: 'reopen',
    handler: handleReopenPost,
    session: () => aSession({status: 'Confirmed'}),
    message: 'Postponement reopened',
    redirectLocation: (id) => `/edit/${id}?organizerPassword=`,
  },
  {
    name: 'delete',
    handler: handleProposedDateDeletePost,
    session: () => aSession({proposedDates: [aProposedDate({id: 'pd-1'})]}),
    queries: {proposedDateId: 'pd-1'},
    message: 'Proposed date deleted',
    redirectLocation: (id) => `/edit/${id}?organizerPassword=`,
  },
  {
    name: 'confirm',
    handler: handleConfirmDatePost,
    session: () => aSession({status: 'Voting', proposedDates: [aProposedDate({id: 'pd-1', votable: true})]}),
    queries: {proposedDateId: 'pd-1'},
    message: 'Date confirmed',
    redirectLocation: (id) => `/edit/${id}?organizerPassword=`,
  },
  {
    name: 'players',
    handler: handleEditPlayersPost,
    session: () => aSession(),
    body: {playerName: 'Alice'},
    message: 'Player added',
    redirectLocation: (id) => `/edit/${id}`,
  },
  {
    name: 'add-dates (single)',
    handler: handleEditProposedDatesPost,
    session: () => aSession(),
    body: {proposedDateTime: '09/01/2025 08:00 pm'},
    message: 'Proposed date added!',
    redirectLocation: (id) => `/edit/${id}`,
  },
  {
    name: 'refresh-clashes',
    handler: handleRefreshClashesPost,
    session: () => aSession({proposedDates: [aProposedDate()]}),
    message: 'Schedule check refreshed',
    redirectLocation: (id) => `/edit/${id}?organizerPassword=`,
    saves: false,
  },
];

describe('edit POST handlers through the command seam', () => {
  beforeEach(() => {
    vi.spyOn(temporalUtils, 'nowPlainDateTimeIso').mockReturnValue(FIXED_TODAY_ISO);
  });

  describe.each(pipelineCases)('$name', ({handler, session: makeSession, queries, body, message, redirectLocation, saves = true}) => {
    test('rejects a missing session with the shared not-found error', async () => {
      const app = createApp({params: {id: 'missing'}, queries, body});

      await expect(handler(app))
        .rejects
        .toThrow('Session not found');
    });

    test(`${saves ? 'saves once and renders' : 'renders without saving'} the partial with its outcome message`, async () => {
      const session = makeSession();
      const app = createApp({params: {id: session.id}, queries, body, headers: {'HX-Request': 'true'}});
      await app.store.save(session);
      const saveSpy = vi.spyOn(app.store, 'save');

      const html = await (await handler(app)).text();

      expect(saveSpy)
        .toHaveBeenCalledTimes(saves ? 1 : 0);
      expect(occurrenceCount(html, `<p id="clipboard-status"`))
        .toBe(1);
      expect(html)
        .toContain(message);
    });

    test('redirects when not partial', async () => {
      const session = makeSession();
      const app = createApp({params: {id: session.id}, queries, body});
      await app.store.save(session);

      const response = await handler(app);

      expect(response.status)
        .toBe(302);
      expect(response.headers.get('location'))
        .toBe(redirectLocation(session.id));
    });
  });
});
