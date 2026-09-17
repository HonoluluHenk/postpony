import { describe, expect, test } from 'vitest';
import { aPlayer, aProposedDate, aSession, aVote } from '../../lib/__test-utils__/builders';
import { createApp } from '../../lib/__test-utils__/create-app';
import { formatProposedDateDisplay } from '../../lib/temporal-utils';
import { getTranslation, inputFormat, languageOptions } from '../../locales';
import { ConfirmedInfoPage, type ConfirmedInfoPageProps } from './confirmed-info';
import { renderConfirmedInfo, renderVoteStep } from './vote-view';

describe('renderVoteStep date visibility', () => {
  test.each(['home', 'away'] as const)('%s team sees every date when all are votable', async (team) => {
    const player = aPlayer({teamId: team});
    const session = aSession({
      status: 'Voting',
      players: [player],
      proposedDates: [
        aProposedDate({id: 'date-1', votable: true}),
        aProposedDate({id: 'date-2', votable: true}),
      ],
    });
    const app = createApp();
    await app.store.save(session);

    const response = renderVoteStep(app, {
      session,
      team,
      token: 'token',
      player,
    });
    const body = await response.text();

    expect(body)
      .toContain('name="vote-date-1"');
    expect(body)
      .toContain('name="vote-date-2"');
  });

  test.each(['home', 'away'] as const)('hides a closed date from the %s team poll', async (team) => {
    const player = aPlayer({teamId: team});
    const session = aSession({
      status: 'Voting',
      players: [player],
      proposedDates: [
        aProposedDate({id: 'date-1', votable: true}),
        aProposedDate({id: 'date-2', votable: false}),
      ],
    });
    const app = createApp();
    await app.store.save(session);

    const response = renderVoteStep(app, {
      session,
      team,
      token: 'token',
      player,
    });
    const body = await response.text();

    expect(body)
      .toContain('name="vote-date-1"');
    expect(body)
      .not
      .toContain('name="vote-date-2"');
  });

  test.each([
    'home',
    'away',
  ] as const)('renders the empty-state hint for the %s team when no dates are votable', async (team) => {
    const player = aPlayer({teamId: team});
    const session = aSession({
      status: 'Draft',
      players: [player],
      proposedDates: [aProposedDate({votable: false})],
    });
    const app = createApp();
    await app.store.save(session);

    const response = renderVoteStep(app, {
      session,
      team,
      token: 'token',
      player,
    });
    const body = await response.text();

    expect(body)
      .toContain('No dates have been proposed yet');
    expect(body)
      .not
      .toContain('name="vote-');
    expect(body)
      .not
      .toContain('Vote Summary');
  });
});

describe('renderVoteStep', () => {
  test('renders the vote form with the current vote checked and the shared tally at its heading levels', async () => {
    const player = aPlayer({id: 'player-1', name: 'Alice'});
    const session = aSession({
      status: 'Voting',
      players: [player],
      proposedDates: [aProposedDate({votable: true})],
      votes: [aVote({participantId: 'player-1', proposedDateId: 'proposed-date-1', type: 'Yes'})],
    });
    const app = createApp();
    await app.store.save(session);

    const response = renderVoteStep(app, {
      session,
      team: 'home',
      token: 'token',
      player,
      updated: true,
    });
    const body = await response.text();

    expect(body)
      .toContain('Vote on Proposed Dates');
    expect(body)
      .toContain('class="toast success top" role="status"');
    expect(body)
      .toContain('Your votes have been saved!');
    expect(body)
      .toContain('name="vote-proposed-date-1"');
    expect(body)
      .toContain('value="Yes" checked=""');
    expect(body)
      .toContain('<h3 id="vote-summary-title">Vote Summary</h3>');
  });

  test('renders the set-all button group above the date fieldsets', async () => {
    const player = aPlayer({id: 'player-1', name: 'Alice'});
    const session = aSession({
      status: 'Voting',
      players: [player],
      proposedDates: [
        aProposedDate({id: 'date-1', votable: true}),
        aProposedDate({id: 'date-2', votable: true}),
      ],
    });
    const app = createApp();
    await app.store.save(session);

    const response = renderVoteStep(app, {
      session,
      team: 'home',
      token: 'token',
      player,
    });
    const body = await response.text();

    expect(body)
      .toContain('<legend>Set all:</legend>');
    expect(body)
      .toContain('data-set-all="Yes"');
    expect(body)
      .toContain('data-set-all="IfNecessary"');
    expect(body)
      .toContain('data-set-all="No"');
    // The accessible name says what the button does; the visible text stays short.
    expect(body)
      .toContain('aria-label="Set all: Yes"');
    expect(body)
      .toContain('aria-label="Set all: if necessary"');
    expect(body)
      .toContain('aria-label="Set all: No"');
    expect(body.indexOf('data-set-all="Yes"'))
      .toBeLessThan(body.indexOf('name="vote-date-1"'));
  });

  test('omits the set-all group when no date is votable', async () => {
    const player = aPlayer({id: 'player-1', name: 'Alice'});
    const session = aSession({
      status: 'Voting',
      players: [player],
      proposedDates: [aProposedDate({votable: false})],
    });
    const app = createApp();
    await app.store.save(session);

    const response = renderVoteStep(app, {
      session,
      team: 'home',
      token: 'token',
      player,
    });
    const body = await response.text();

    expect(body)
      .not
      .toContain('data-set-all');
  });

  test('explains each yes/no/if-necessary choice in a tooltip on both the set-all buttons and the radios', async () => {
    const player = aPlayer({id: 'player-1', name: 'Alice'});
    const session = aSession({
      status: 'Voting',
      players: [player],
      proposedDates: [aProposedDate({id: 'date-1', votable: true})],
    });
    const app = createApp();
    await app.store.save(session);

    const response = renderVoteStep(app, {
      session,
      team: 'home',
      token: 'token',
      player,
    });
    const body = await response.text();

    for (const text of ['Yes, I have time', 'I don&#39;t have time', 'I&#39;ll make it work if needed']) {
      expect(body)
        .toContain(text);
    }
    expect(body)
      .toContain('aria-describedby="set-all-yes-tooltip"');
    expect(body)
      .toContain('id="set-all-ifnecessary-tooltip"');
    expect(body)
      .toContain('role="tooltip"');
    expect(body)
      .toContain('aria-describedby="vote-yes-date-1-tooltip"');
    expect(body)
      .toContain('id="vote-no-date-1-tooltip"');
  });

  test('posts the vote as an HTMX swap of #vote-region', async () => {
    const player = aPlayer({id: 'player-1', name: 'Alice'});
    const session = aSession({
      status: 'Voting',
      players: [player],
      proposedDates: [aProposedDate({id: 'date-1', votable: true})],
    });
    const app = createApp();
    await app.store.save(session);

    const response = renderVoteStep(app, {
      session,
      team: 'home',
      token: 'token',
      player,
    });
    const body = await response.text();

    expect(body)
      .toContain('<div id="vote-region">');
    expect(body)
      .toContain('hx-post="/join/test-session/home/vote?playerId=player-1&amp;token=token"');
    expect(body)
      .toContain('hx-target="#vote-region"');
  });

  test('renders just the vote region for an HTMX request', async () => {
    const player = aPlayer({id: 'player-1', name: 'Alice'});
    const session = aSession({
      status: 'Voting',
      players: [player],
      proposedDates: [aProposedDate({id: 'date-1', votable: true})],
    });
    const app = createApp({headers: {'HX-Request': 'true'}});
    await app.store.save(session);

    const response = renderVoteStep(app, {
      session,
      team: 'home',
      token: 'token',
      player,
    });
    const body = await response.text();

    expect(body)
      .toContain('<div id="vote-region">');
    expect(body)
      .toContain('name="vote-date-1"');
    expect(body)
      .not
      .toContain('<!DOCTYPE html>');
    expect(body)
      .not
      .toContain('id="main-content"');
  });

  test('asks HTMX to refresh the page when a partial save finds the session confirmed', async () => {
    const player = aPlayer();
    const session = aSession({
      status: 'Confirmed',
      confirmedProposedDateId: 'proposed-date-1',
      players: [player],
      proposedDates: [aProposedDate()],
    });
    const app = createApp({headers: {'HX-Request': 'true'}});
    await app.store.save(session);

    const response = renderVoteStep(app, {
      session,
      team: 'home',
      token: 'token',
      player,
    });

    expect(response.headers.get('HX-Refresh'))
      .toBe('true');
    expect(await response.text())
      .toContain('Voting is closed');
  });

  test('renders the votable dates chronologically and keeps the results table aligned', async () => {
    const player = aPlayer({id: 'player-1', name: 'Alice'});
    const session = aSession({
      status: 'Voting',
      players: [player],
      proposedDates: [
        aProposedDate({id: 'date-later', dateTimeRange: {start: '2026-09-12T18:00'}}),
        aProposedDate({id: 'date-earlier', dateTimeRange: {start: '2026-09-05T18:00'}}),
      ],
      votes: [
        aVote({proposedDateId: 'date-earlier', participantId: 'player-1', type: 'Yes'}),
        aVote({proposedDateId: 'date-later', participantId: 'player-1', type: 'IfNecessary'}),
      ],
    });
    const app = createApp();
    await app.store.save(session);

    const response = renderVoteStep(app, {
      session,
      team: 'home',
      token: 'token',
      player,
    });
    const body = await response.text();

    const earlier = formatProposedDateDisplay('2026-09-05T18:00', 'en-US');
    const later = formatProposedDateDisplay('2026-09-12T18:00', 'en-US');

    const earlierRadio = body.indexOf('name="vote-date-earlier"');
    const laterRadio = body.indexOf('name="vote-date-later"');
    expect(earlierRadio)
      .toBeGreaterThan(0);
    expect(laterRadio)
      .toBeGreaterThan(earlierRadio);

    expect(body.indexOf(`>${earlier}</td>`))
      .toBeLessThan(body.indexOf(`>${later}</td>`));
  });

  test('renders the confirmed-info view when the session is Confirmed', async () => {
    const player = aPlayer();
    const session = aSession({
      status: 'Confirmed',
      confirmedProposedDateId: 'proposed-date-1',
      reopenCount: 1,
      players: [player],
      proposedDates: [aProposedDate()],
    });
    const app = createApp();
    await app.store.save(session);

    const response = renderVoteStep(app, {
      session,
      team: 'home',
      token: 'token',
      player,
    });
    const body = await response.text();

    expect(body)
      .toContain('Postponement Confirmed');
    expect(body)
      .toContain('Voting is closed');
    expect(body)
      .toContain('Sep 1, 2025');
    expect(body)
      .not
      .toContain('name="vote-');
  });

  test('renders dates in the locale input format for de-CH', async () => {
    const player = aPlayer();
    const session = aSession({
      status: 'Voting',
      players: [player],
      proposedDates: [aProposedDate()],
    });
    const app = createApp({locale: 'de-CH'});
    await app.store.save(session);

    const response = renderVoteStep(app, {
      session,
      team: 'home',
      token: 'token',
      player,
    });
    const body = await response.text();

    expect(body)
      .toContain('01.09.2025');
    expect(body)
      .toContain('20:00');
    expect(body)
      .not
      .toContain('Sep 1, 2025');
  });

  test('renders the venue number and short name inside the vote page\'s venue pill', async () => {
    const player = aPlayer();
    const session = aSession({
      status: 'Voting',
      venues: [
        {
          venueNumber: 1,
          name: 'Turnhalle orange',
          shortName: 'Turnhalle orange',
          address: 'Dennigkofenweg 169',
          postalCode: '3072',
          city: 'Ostermundigen',
        },
        {
          venueNumber: 2,
          name: 'Turnhalle grün',
          shortName: 'Turnhalle grün',
          address: 'Dennigkofenweg 170',
          postalCode: '3072',
          city: 'Ostermundigen',
        },
      ],
      players: [player],
      proposedDates: [
        aProposedDate({id: 'date-1', venueNumber: 2, votable: true}),
        // legacy date without a stored venue number defaults to the (1) badge
        {...aProposedDate({id: 'date-2', votable: true}), venueNumber: undefined},
      ],
    });
    const app = createApp();
    await app.store.save(session);

    const response = renderVoteStep(app, {
      session,
      team: 'home',
      token: 'token',
      player,
    });
    const body = await response.text();

    expect(body)
      .toContain('>(2) Turnhalle grün<span class="visually-hidden">2 – Turnhalle grün</span>');
    expect(body)
      .toContain('>(1) Turnhalle orange<span class="visually-hidden">1 – Turnhalle orange</span>');
  });

  test('renders just the venue number in the pill when no venue name is known', async () => {
    const player = aPlayer();
    const session = aSession({
      status: 'Voting',
      players: [player],
      proposedDates: [
        aProposedDate({id: 'date-1', votable: true, venueNumber: 4}),
      ],
    });
    const app = createApp();
    await app.store.save(session);

    const response = renderVoteStep(app, {
      session,
      team: 'home',
      token: 'token',
      player,
    });
    const body = await response.text();

    expect(body)
      .toContain('>(4)</span></legend>');
  });

  test('appends the occupancy count to the number-only pill when the venue is unknown', async () => {
    const player = aPlayer();
    const session = aSession({
      status: 'Voting',
      players: [player],
      proposedDates: [
        aProposedDate({
          id: 'date-1',
          votable: true,
          venueNumber: 4,
          venueOccupancy: {count: 2, matches: [{opponent: 'Port', start: '2025-09-01T20:15'}]},
        }),
      ],
    });
    const app = createApp();
    await app.store.save(session);

    const response = renderVoteStep(app, {
      session,
      team: 'home',
      token: 'token',
      player,
    });
    const body = await response.text();

    expect(body)
      .toContain('>(4), 2 other games</span></legend>');
  });

  test('truncates a multi-line venue name at the first comma in the vote pill', async () => {
    const player = aPlayer();
    const session = aSession({
      status: 'Voting',
      venues: [
        {
          venueNumber: 1,
          name: 'Turnhalle orange, UG, Schule Dennigkofen',
          shortName: 'Turnhalle orange',
          address: 'Dennigkofenweg 169',
          postalCode: '3072',
          city: 'Ostermundigen',
        },
      ],
      players: [player],
      proposedDates: [
        aProposedDate({id: 'date-1', votable: true, venueNumber: 1}),
      ],
    });
    const app = createApp();
    await app.store.save(session);

    const response = renderVoteStep(app, {
      session,
      team: 'home',
      token: 'token',
      player,
    });
    const body = await response.text();

    // Visible pill text is the first comma-segment; the full name is exposed to
    // assistive tech as visually-hidden text instead of an unreachable title.
    expect(body)
      .toContain('>(1) Turnhalle orange<span class="visually-hidden">1 – Turnhalle orange, UG, Schule Dennigkofen</span>');
    expect(body)
      .not
      .toContain('title="1 – Turnhalle orange');
  });

  test('falls back to the full venue name when the venue predates shortName', async () => {
    const player = aPlayer();
    const session = aSession({
      status: 'Voting',
      venues: [
        {
          venueNumber: 1,
          name: 'Turnhalle orange, UG, Schule Dennigkofen',
          address: 'Dennigkofenweg 169',
          postalCode: '3072',
          city: 'Ostermundigen',
        },
      ],
      players: [player],
      proposedDates: [
        aProposedDate({id: 'date-1', votable: true, venueNumber: 1}),
      ],
    });
    const app = createApp();
    await app.store.save(session);

    const response = renderVoteStep(app, {
      session,
      team: 'home',
      token: 'token',
      player,
    });
    const body = await response.text();

    expect(body)
      .toContain('>(1) Turnhalle orange, UG, Schule Dennigkofen<span');
  });

  test('renders the export-calendar link when votable dates exist', async () => {
    const player = aPlayer({id: 'player-1', name: 'Alice'});
    const session = aSession({
      status: 'Voting',
      players: [player],
      proposedDates: [aProposedDate({votable: true})],
    });
    const app = createApp();
    await app.store.save(session);

    const response = renderVoteStep(app, {
      session,
      team: 'home',
      token: 'token',
      player,
    });
    const body = await response.text();

    expect(body)
      .toContain('href="https://game-scheduler.localhost:3000/join/test-session/home/calendar.ics?token=token&amp;playerId=player-1"');
    expect(body)
      .toContain('Export as calendar (.ics)');
  });

  test('hides the export-calendar link when no date is votable', async () => {
    const player = aPlayer({id: 'player-1', name: 'Alice'});
    const session = aSession({
      status: 'Voting',
      players: [player],
      proposedDates: [aProposedDate({votable: false})],
    });
    const app = createApp();
    await app.store.save(session);

    const response = renderVoteStep(app, {
      session,
      team: 'home',
      token: 'token',
      player,
    });
    const body = await response.text();

    expect(body)
      .not
      .toContain('/join/test-session/home/calendar.ics');
  });

  test('renders the switch-participant link below the vote region on a full page', async () => {
    const player = aPlayer({id: 'player-1', name: 'Alice'});
    const session = aSession({
      status: 'Voting',
      players: [player],
      proposedDates: [aProposedDate({votable: true})],
    });
    const app = createApp();
    await app.store.save(session);

    const response = renderVoteStep(app, {
      session,
      team: 'home',
      token: 'token',
      player,
    });
    const body = await response.text();

    expect(body)
      .toContain('Not you? Vote as someone else');
    expect(body)
      .toContain('href="/join/test-session/home?token=token"');
    expect(body)
      .toContain('removeItem(\'postpony-player-test-session-home\')');
    // The link sits outside #vote-region, so an HTMX vote save never replaces it.
    expect(body.indexOf('id="vote-region"'))
      .toBeLessThan(body.indexOf('id="switch-participant"'));
  });

  test('omits the switch-participant link from the HTMX vote-region partial', async () => {
    const player = aPlayer({id: 'player-1', name: 'Alice'});
    const session = aSession({
      status: 'Voting',
      players: [player],
      proposedDates: [aProposedDate({votable: true})],
    });
    const app = createApp({headers: {'HX-Request': 'true'}});
    await app.store.save(session);

    const response = renderVoteStep(app, {
      session,
      team: 'home',
      token: 'token',
      player,
    });
    const body = await response.text();

    expect(body)
      .not
      .toContain('Not you? Vote as someone else');
  });

  test('renders no switch-participant link once the session is Confirmed', async () => {
    const player = aPlayer({id: 'player-1', name: 'Alice'});
    const session = aSession({
      status: 'Confirmed',
      confirmedProposedDateId: 'proposed-date-1',
      players: [player],
      proposedDates: [aProposedDate()],
    });
    const app = createApp();
    await app.store.save(session);

    const response = renderVoteStep(app, {
      session,
      team: 'home',
      token: 'token',
      player,
    });
    const body = await response.text();

    expect(body)
      .toContain('Voting is closed');
    expect(body)
      .not
      .toContain('Not you? Vote as someone else');
  });
});

describe('renderVoteStep availability description', () => {
  test('explains the vote choices and the calendar export on a full page render', async () => {
    const player = aPlayer({id: 'player-1', name: 'Alice'});
    const session = aSession({
      status: 'Voting',
      players: [player],
      proposedDates: [aProposedDate({votable: true})],
    });
    const app = createApp();
    await app.store.save(session);

    const response = renderVoteStep(app, {
      session,
      team: 'home',
      token: 'token',
      player,
    });
    const body = await response.text();

    expect(body)
      .toContain('Here you can state your availability for each proposed date:<ul>');
    expect(body)
      .toContain('<li><strong>Yes</strong> means you are available.</li>');
    expect(body)
      .toContain('<li><strong>if necessary</strong> means you can make it happen if nobody else is available.</li>');
    expect(body)
      .toContain('<li><strong>No</strong> means you cannot participate.</li>');
    expect(body)
      .toContain('You can change your answers until the organizer confirms a date.');
    expect(body)
      .toContain('download the calendar file (.ics) and import it into your calendar app');
    expect(body)
      .toContain('<strong>Hint:</strong>');
    expect(body)
      .toContain('from your calendar.<br/>It is often easier');
    expect(body)
      .toContain('It is often easier to first accept all the dates and then decline');
    expect(body.indexOf('<li><strong>if necessary</strong>'))
      .toBeLessThan(body.indexOf('<li><strong>No</strong>'));
    expect(body.indexOf('Here you can state your availability'))
      .toBeLessThan(body.indexOf('name="vote-proposed-date-1"'));
  });

  test('renders the description in German for de-CH and uses the German vote labels', async () => {
    const player = aPlayer({id: 'player-1'});
    const session = aSession({
      status: 'Voting',
      players: [player],
      proposedDates: [aProposedDate({votable: true})],
    });
    const app = createApp({locale: 'de-CH'});
    await app.store.save(session);

    const response = renderVoteStep(app, {
      session,
      team: 'home',
      token: 'token',
      player,
    });
    const body = await response.text();

    expect(body)
      .toContain('Hier kannst du deine Verfügbarkeit für jeden vorgeschlagenen Termin angeben:<ul>');
    expect(body)
      .toContain('<li><strong>Ja</strong> bedeutet, dass du verfügbar bist.</li>');
    expect(body.indexOf('<li><strong>notfalls</strong>'))
      .toBeLessThan(body.indexOf('<li><strong>Nein</strong>'));
    expect(body)
      .toContain('Lade die Kalenderdatei (.ics) herunter');
    expect(body)
      .toContain('<strong>Tipp:</strong>');
    expect(body)
      .toContain('ablehnen kannst.<br/>Oft ist es einfacher');
    expect(body)
      .toContain('Oft ist es einfacher, zuerst alle Termine zu akzeptieren');
  });

  test('keeps the description outside the HTMX-swapped vote region', async () => {
    const player = aPlayer({id: 'player-1'});
    const session = aSession({
      status: 'Voting',
      players: [player],
      proposedDates: [aProposedDate({votable: true})],
    });
    const app = createApp({headers: {'HX-Request': 'true'}});
    await app.store.save(session);

    const response = renderVoteStep(app, {
      session,
      team: 'home',
      token: 'token',
      player,
    });
    const body = await response.text();

    expect(body)
      .toContain('<div id="vote-region">');
    expect(body)
      .not
      .toContain('Here you can state your availability');
    expect(body)
      .not
      .toContain('calendar file (.ics)');
  });

  test('hides the description when no date is votable', async () => {
    const player = aPlayer({id: 'player-1'});
    const session = aSession({
      status: 'Voting',
      players: [player],
      proposedDates: [aProposedDate({votable: false})],
    });
    const app = createApp();
    await app.store.save(session);

    const response = renderVoteStep(app, {
      session,
      team: 'home',
      token: 'token',
      player,
    });
    const body = await response.text();

    expect(body)
      .not
      .toContain('Here you can state your availability');
    expect(body)
      .not
      .toContain('calendar file (.ics)');
  });
});

describe('renderVoteStep hides clash info', () => {
  test('renders no clash lines for a date with home and away clashes', async () => {
    const player = aPlayer();
    const session = aSession({
      status: 'Voting',
      homeTeamIdentity: {championship: 'MTTV 2026/27', group: '1. Liga', teamtable: 't1'},
      guestTeamIdentity: {championship: 'MTTV 2026/27', group: '1. Liga', teamtable: 't2'},
      players: [player],
      proposedDates: [
        aProposedDate({
          votable: true,
          clashes: {
            home: [{opponent: 'Thun', start: '2025-09-01T17:00'}],
            away: [{opponent: 'Burgdorf', start: '2025-09-01T21:30'}],
          },
        }),
      ],
    });
    const app = createApp();
    await app.store.save(session);

    const response = renderVoteStep(app, {
      session,
      team: 'home',
      token: 'token',
      player,
    });
    const body = await response.text();

    expect(body)
      .not
      .toContain('Home: 5:00 PM vs Thun');
    expect(body)
      .not
      .toContain('Away: 9:30 PM vs Burgdorf');
    expect(body)
      .not
      .toContain('vs ');
  });

  test('renders no clean-check chip when a check ran clean', async () => {
    const player = aPlayer();
    const session = aSession({
      status: 'Voting',
      homeTeamIdentity: {championship: 'MTTV 2026/27', group: '1. Liga', teamtable: 't1'},
      guestTeamIdentity: {championship: 'MTTV 2026/27', group: '1. Liga', teamtable: 't2'},
      players: [player],
      proposedDates: [
        aProposedDate({
          votable: true,
          clashes: {home: [], away: []},
        }),
      ],
    });
    const app = createApp();
    await app.store.save(session);

    const response = renderVoteStep(app, {
      session,
      team: 'home',
      token: 'token',
      player,
    });
    const body = await response.text();

    expect(body)
      .not
      .toContain('No other games');
  });

  test('renders no "not checked" chip for a hand-entered match without team identities', async () => {
    const player = aPlayer();
    const session = aSession({
      status: 'Voting',
      players: [player],
      proposedDates: [aProposedDate({votable: true})],
    });
    const app = createApp();
    await app.store.save(session);

    const response = renderVoteStep(app, {
      session,
      team: 'home',
      token: 'token',
      player,
    });
    const body = await response.text();

    expect(body)
      .not
      .toContain('Not checked');
  });

  test('a clashing date the organizer re-enabled still renders its vote radios', async () => {
    const player = aPlayer();
    const session = aSession({
      status: 'Voting',
      homeTeamIdentity: {championship: 'MTTV 2026/27', group: '1. Liga', teamtable: 't1'},
      guestTeamIdentity: {championship: 'MTTV 2026/27', group: '1. Liga', teamtable: 't2'},
      players: [player],
      proposedDates: [
        aProposedDate({
          votable: true,
          clashes: {home: [{opponent: 'Thun', start: '2025-09-01T17:00'}], away: []},
        }),
      ],
    });
    const app = createApp();
    await app.store.save(session);

    const response = renderVoteStep(app, {
      session,
      team: 'home',
      token: 'token',
      player,
    });
    const body = await response.text();

    expect(body)
      .toContain('name="vote-proposed-date-1"');
    expect(body)
      .toContain('value="Yes"');
    expect(body)
      .toContain('value="IfNecessary"');
    expect(body)
      .toContain('value="No"');
  });
});

describe('renderVoteStep venue occupancy info', () => {
  test('renders the occupancy count beside the venue in the legend', async () => {
    const player = aPlayer();
    const session = aSession({
      status: 'Voting',
      venues: [
        {
          venueNumber: 1,
          name: 'Turnhalle orange',
          shortName: 'Turnhalle orange',
          address: 'Dennigkofenweg 169',
          postalCode: '3072',
          city: 'Ostermundigen',
        },
      ],
      players: [player],
      proposedDates: [
        aProposedDate({
          votable: true,
          venueOccupancy: {
            count: 2,
            matches: [
              {opponent: 'Port', start: '2025-09-01T20:15'},
              {opponent: 'Bern', start: '2025-09-01T19:30'},
            ],
          },
        }),
      ],
    });
    const app = createApp();
    await app.store.save(session);

    const response = renderVoteStep(app, {
      session,
      team: 'home',
      token: 'token',
      player,
    });
    const body = await response.text();

    expect(body)
      .toContain('>(1) Turnhalle orange, 2 other games<span class="visually-hidden">1 – Turnhalle orange</span>');
    expect(body)
      .not
      .toContain('2 other games at this venue');
  });

  test('renders the singular occupancy text for a count of one', async () => {
    const player = aPlayer();
    const session = aSession({
      status: 'Voting',
      venues: [
        {
          venueNumber: 1,
          name: 'Turnhalle orange',
          shortName: 'Turnhalle orange',
          address: 'Dennigkofenweg 169',
          postalCode: '3072',
          city: 'Ostermundigen',
        },
      ],
      players: [player],
      proposedDates: [
        aProposedDate({
          votable: true,
          venueOccupancy: {
            count: 1,
            matches: [{opponent: 'Port', start: '2025-09-01T20:15'}],
          },
        }),
      ],
    });
    const app = createApp();
    await app.store.save(session);

    const response = renderVoteStep(app, {
      session,
      team: 'home',
      token: 'token',
      player,
    });
    const body = await response.text();

    expect(body)
      .toContain('>(1) Turnhalle orange, 1 other game<span class="visually-hidden">1 – Turnhalle orange</span>');
    expect(body)
      .not
      .toContain('1 other games');
  });

  test('renders no venue-occupancy trigger on the vote page', async () => {
    const player = aPlayer();
    const session = aSession({
      status: 'Voting',
      players: [player],
      proposedDates: [
        aProposedDate({
          votable: true,
          venueOccupancy: {count: 2, matches: [{opponent: 'Port', start: '2025-09-01T20:15'}]},
        }),
      ],
    });
    const app = createApp();
    await app.store.save(session);

    const response = renderVoteStep(app, {
      session,
      team: 'home',
      token: 'token',
      player,
    });
    const body = await response.text();

    // The occupancy count surfaces in the legend, never as a clickable trigger
    // (vote-choice tooltips carry role="tooltip"/aria-describedby legitimately).
    expect(body)
      .not
      .toContain('data-occupancy-trigger');
  });

  test('omits the count clause from the legend when the occupancy check ran clean', async () => {
    const player = aPlayer();
    const session = aSession({
      status: 'Voting',
      venues: [
        {
          venueNumber: 1,
          name: 'Turnhalle orange',
          shortName: 'Turnhalle orange',
          address: 'Dennigkofenweg 169',
          postalCode: '3072',
          city: 'Ostermundigen',
        },
      ],
      players: [player],
      proposedDates: [
        aProposedDate({
          votable: true,
          venueOccupancy: {count: 0, matches: []},
        }),
      ],
    });
    const app = createApp();
    await app.store.save(session);

    const response = renderVoteStep(app, {
      session,
      team: 'home',
      token: 'token',
      player,
    });
    const body = await response.text();

    expect(body)
      .toContain('>(1) Turnhalle orange<span class="visually-hidden">1 – Turnhalle orange</span>');
    expect(body)
      .not
      .toContain('other games');
    expect(body)
      .not
      .toContain('Venue empty');
  });

  test('omits the count clause when occupancy data is absent (hand-entered match or failed scrape)', async () => {
    const player = aPlayer();
    const session = aSession({
      status: 'Voting',
      players: [player],
      proposedDates: [aProposedDate({votable: true})],
    });
    const app = createApp();
    await app.store.save(session);

    const response = renderVoteStep(app, {
      session,
      team: 'home',
      token: 'token',
      player,
    });
    const body = await response.text();

    expect(body)
      .not
      .toContain('other games');
    expect(body)
      .not
      .toContain('Venue empty');
  });

  test('renders the localized de-CH occupancy count in the legend', async () => {
    const player = aPlayer();
    const session = aSession({
      status: 'Voting',
      venues: [
        {
          venueNumber: 1,
          name: 'Turnhalle orange',
          shortName: 'Turnhalle orange',
          address: 'Dennigkofenweg 169',
          postalCode: '3072',
          city: 'Ostermundigen',
        },
      ],
      players: [player],
      proposedDates: [
        aProposedDate({id: 'date-1', votable: true, venueOccupancy: {count: 2, matches: []}}),
        aProposedDate({id: 'date-2', votable: true, venueOccupancy: {count: 0, matches: []}}),
      ],
    });
    const app = createApp({locale: 'de-CH'});
    await app.store.save(session);

    const response = renderVoteStep(app, {
      session,
      team: 'home',
      token: 'token',
      player,
    });
    const body = await response.text();

    expect(body)
      .toContain('2 weitere Spiele');
    expect(body)
      .not
      .toContain('Halle leer');
  });
});

describe('renderConfirmedInfo', () => {
  test('renders the confirmed date chip and hides the reopen count when it is zero', async () => {
    const session = aSession({
      status: 'Confirmed',
      confirmedProposedDateId: 'proposed-date-1',
      proposedDates: [aProposedDate()],
    });
    const app = createApp();

    const response = renderConfirmedInfo(app, session, {team: 'home', token: 'token'});
    const body = await response.text();

    expect(body)
      .toContain('Postponement Confirmed');
    expect(body)
      .toContain('Sep 1, 2025');
    expect(body)
      .not
      .toContain('Reopened');
  });

  test('renders the export-calendar link when votable dates remain', async () => {
    const session = aSession({
      status: 'Confirmed',
      confirmedProposedDateId: 'proposed-date-1',
      proposedDates: [aProposedDate()],
    });
    const app = createApp();

    const response = renderConfirmedInfo(app, session, {team: 'home', token: 'token'});
    const body = await response.text();

    expect(body)
      .toContain('href="https://game-scheduler.localhost:3000/join/test-session/home/calendar.ics?token=token"');
    expect(body)
      .toContain('Export as calendar (.ics)');
  });

  test('appends the identified playerId to the export-calendar link', async () => {
    const session = aSession({
      status: 'Confirmed',
      confirmedProposedDateId: 'proposed-date-1',
      proposedDates: [aProposedDate()],
    });
    const app = createApp();

    const response = renderConfirmedInfo(app, session, {team: 'home', token: 'token', playerId: 'player-1'});
    const body = await response.text();

    expect(body)
      .toContain('href="https://game-scheduler.localhost:3000/join/test-session/home/calendar.ics?token=token&amp;playerId=player-1"');
  });

  test('renderVoteStep echoes the identified playerId on the confirmed-info export link', async () => {
    const player = aPlayer({id: 'player-1'});
    const session = aSession({
      status: 'Confirmed',
      confirmedProposedDateId: 'proposed-date-1',
      players: [player],
      proposedDates: [aProposedDate()],
    });
    const app = createApp();
    await app.store.save(session);

    const response = renderVoteStep(app, {
      session,
      team: 'home',
      token: 'token',
      player,
    });
    const body = await response.text();

    expect(body)
      .toContain('Voting is closed');
    expect(body)
      .toContain('href="https://game-scheduler.localhost:3000/join/test-session/home/calendar.ics?token=token&amp;playerId=player-1"');
  });

  test('hides the export-calendar link when no date is votable', async () => {
    const session = aSession({
      status: 'Confirmed',
      confirmedProposedDateId: 'proposed-date-1',
      proposedDates: [aProposedDate({votable: false})],
    });
    const app = createApp();

    const response = renderConfirmedInfo(app, session, {team: 'home', token: 'token'});
    const body = await response.text();

    expect(body)
      .not
      .toContain('/join/test-session/home/calendar.ics');
  });

  test('ConfirmedInfoPage falls back to the translated title when called without one', () => {
    const props: ConfirmedInfoPageProps = {
      t: (key, params) => getTranslation('en-US', key, params),
      locale: 'en-US',
      isPartial: false,
      baseUrl: 'https://game-scheduler.localhost:3000',
      inputFormat: inputFormat('en-US'),
      languageOptions: languageOptions(),
      confirmedDateDisplay: 'Sep 1, 2025, 8:00 PM',
      reopenCount: 0,
      sessionId: 'session-1',
      team: 'home',
      token: 'token',
      hasVotableDates: false,
    };

    const html = (ConfirmedInfoPage(props) as {
      toString(): string
    })
      .toString();

    expect(html)
      .toContain('<h2>Postponement Confirmed</h2>');
  });
});
