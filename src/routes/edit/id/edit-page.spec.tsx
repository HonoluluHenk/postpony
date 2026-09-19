import { describe, expect, it } from 'vitest';
import merge from 'lodash-es/merge';
import { aPlayer, aProposedDate, aSession, aVote } from '../../../lib/__test-utils__/builders';
import type { Postponement } from '../../../lib/models';
import { getTranslation, inputFormat, languageOptions, type TranslationKeys } from '../../../locales';
import { EditGrid, EditPage, type EditPageProps } from './edit';
import { buildEditPartialsData } from './render-edit-partials';

const t = (key: TranslationKeys, params?: Record<string, string>): string =>
  getTranslation('en-US', key, params);

const BASE_URL = 'https://game-scheduler.localhost:3000';

function buildSession(overrides: Parameters<typeof aSession>[0] = {}): Postponement {
  return aSession(merge({
    homeTeam: 'Home Team',
    guestTeam: 'Guest Team',
    status: 'Voting',
    players: [
      aPlayer({id: 'p1', name: 'Alice', teamId: 'home'}),
      aPlayer({id: 'p2', name: 'Bob', teamId: 'home'}),
      aPlayer({id: 'p3', name: 'Carol', teamId: 'away'}),
    ],
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
    proposedDates: [
      aProposedDate({
        id: 'pd-1',
        dateTimeRange: {start: '2026-09-01T20:00', end: '2026-09-01T22:00'},
        votable: true,
        venueNumber: 1,
      }),
      aProposedDate({
        id: 'pd-2',
        dateTimeRange: {start: '2026-09-08T20:00', end: '2026-09-08T22:00'},
        votable: false,
        venueNumber: 2,
      }),
    ],
    votes: [
      aVote({id: 'v1', proposedDateId: 'pd-1', participantId: 'p1', type: 'Yes'}),
      aVote({id: 'v2', proposedDateId: 'pd-1', participantId: 'p2', type: 'No'}),
    ],
  }, overrides));
}

interface PageOptions {
  session?: Postponement;
  organizerPassword?: string;
  proposedDateTimeDisplay?: string;
  isPartial?: boolean;
  currentUrl?: string;
}

function baseProps(options: PageOptions = {}): EditPageProps {
  const session = options.session ?? buildSession();
  return {
    session,
    t,
    locale: 'en-US',
    isPartial: options.isPartial ?? false,
    baseUrl: BASE_URL,
    inputFormat: inputFormat('en-US'),
    languageOptions: languageOptions(),
    ...buildEditPartialsData(session, 'en-US'),
    organizerPassword: options.organizerPassword,
    currentUrl: options.currentUrl ?? `${BASE_URL}/edit/sess-1`,
    proposedDateTimeDisplay: options.proposedDateTimeDisplay ?? 'Tue, Sep 1, 2026, 8:00 PM',
  };
}

function renderToString(node: unknown): string {
  if (node === null || node === undefined) {
    return '';
  }
  return (node as {
    toString(): string
  }).toString();
}

describe('EditPage single-line header', () => {
  it('renders the match-up and the proposed datetime on one headline line', () => {
    const html = renderToString(EditPage(baseProps()));

    expect(html)
      .toMatch(/<h1 class="max center-align"[^>]*>\s*<span class="redesign-headline">/);
    expect(html)
      .toContain('Home Team vs Guest Team');
    expect(html)
      .toContain('<span class="redesign-headline-sep">·</span>');
    expect(html)
      .toContain('Tue, Sep 1, 2026, 8:00 PM');
  });

  it('omits the datetime span and separator when no display datetime is provided', () => {
    const html = renderToString(EditPage(baseProps({proposedDateTimeDisplay: ''})));

    expect(html)
      .toContain('Home Team vs Guest Team');
    expect(html)
      .not
      .toContain('redesign-headline-sep');
  });

  it('renders a bare headline when the session carries no team names', () => {
    const session: Postponement = {...aSession(), homeTeam: undefined, guestTeam: undefined};
    const html = renderToString(EditPage(baseProps({session})));

    expect(html)
      .toContain(' vs ');
    expect(html)
      .not
      .toContain('Home Team vs Guest Team');
  });
});

describe('EditPage bookmark toast', () => {
  it('announces the bookmark hint as a status with a copy button for the current URL', () => {
    const html = renderToString(EditPage(baseProps({organizerPassword: 'pw-123'})));

    expect(html)
      .toContain('<div class="toast primary white-text top" role="status">');
    expect(html)
      .toContain('Bookmark this page');
    expect(html)
      .toContain('without this link, you can never access it again');
    expect(html)
      .not
      .toContain('Your Organizer Password');
    expect(html)
      .not
      .toContain('password-display');
    expect(html)
      .not
      .toContain('role="alert"');
  });

  it('renders a copy button with the page-link label on the line above', () => {
    const html = renderToString(EditPage(baseProps({organizerPassword: 'pw-123'})));

    expect(html)
      .toContain('Copy link to this page: ');
    expect(html)
      .toMatch(/Copy link to this page: <button[^>]*data-copy="https:\/\/game-scheduler\.localhost:3000\/edit\/sess-1[^"]*"/);
    expect(html)
      .toContain('aria-label="Copy the page address"');
    expect(html)
      .toContain('data-copied-label="Copied to clipboard"');
  });

  it('omits the toast on a partial render', () => {
    const html = renderToString(EditPage(baseProps({isPartial: true})));

    expect(html)
      .not
      .toContain('Bookmark this page');
  });
});

describe('EditPage redesigned grid and sidebar', () => {
  it('renders the edit grid and the sidebar status chip', () => {
    const html = renderToString(EditPage(baseProps()));

    expect(html)
      .toContain('<div class="edit-redesign">');
    expect(html)
      .toContain('<div id="edit-grid" class="edit-grid">');
    expect(html)
      .toContain('class="edit-sidebar"');
    expect(html)
      .toContain('<p class="chip outline" id="status-chip">Status: Voting</p>');
  });

  it('renders the invite links with icon-only copy buttons', () => {
    const html = renderToString(EditPage(baseProps()));

    expect(html)
      .toContain(`href="${BASE_URL}/join/test-session/home?token=home-player-pw"`);
    expect(html)
      .toContain(`href="${BASE_URL}/opponent/test-session?opponentCaptainPassword=opponent-captain-pw"`);
    expect(html)
      .not
      .toContain(`href="${BASE_URL}/join/test-session/away?token=away-player-pw"`);
    expect(html)
      .toMatch(/class="copy-btn"[^>]*data-copy="https:\/\/game-scheduler.localhost:3000\/join\/test-session\/home\?token=home-player-pw"/);
    expect(html)
      .toMatch(/class="copy-btn"[^>]*data-copy="https:\/\/game-scheduler.localhost:3000\/opponent\/test-session\?opponentCaptainPassword=opponent-captain-pw"/);
    expect(html)
      .toContain('aria-label="Copy to clipboard"');
    expect(html)
      .toContain('My team invitation link (Home Team)');
    expect(html)
      .toContain('Opponent captain link (Guest Team)');
    expect(html)
      .not
      .toContain('Opponent team invitation link (Guest Team)');
  });

  it('orders the two invite links my-team then opponent captain', () => {
    const html = renderToString(EditPage(baseProps()));

    const myLink = html.indexOf(`href="${BASE_URL}/join/test-session/home?token=home-player-pw"`);
    const captainLink = html.indexOf(`href="${BASE_URL}/opponent/test-session?opponentCaptainPassword=opponent-captain-pw"`);

    expect(myLink)
      .toBeGreaterThanOrEqual(0);
    expect(captainLink)
      .toBeGreaterThan(myLink);
  });

  it('offers reopen and shows the reopen count when the postponement is confirmed', () => {
    const session = buildSession({status: 'Confirmed', reopenCount: 2});
    const html = renderToString(EditPage(baseProps({session})));

    expect(html)
      .toContain('Reopened 2 time(s)');
    expect(html)
      .toContain('hx-post="/edit/test-session/reopen"');
    expect(html)
      .toContain('>Reopen</button>');
  });
});

describe('EditPage week-grouped date rows', () => {
  it('groups the proposed dates into week headings with a date range', () => {
    const html = renderToString(EditPage(baseProps()));

    expect(html)
      .toContain('<h3 class="week-head">');
    expect(html)
      .toContain('<span class="week-range">Aug 31 – Sep 6</span>');
    expect(html)
      .toContain('Week 36');
    expect(html)
      .toContain('Week 37');
    expect(html)
      .toContain('class="date-row"');
    expect(html)
      .toContain('class="date-cell"');
    expect(html)
      .toContain('September 1');
    expect(html)
      .toContain('8:00 PM');
  });

  it('renders per-player vote dots alongside the restored vote tables', () => {
    const html = renderToString(EditPage(baseProps()));

    expect(html)
      .toContain('class="vote-dots"');
    expect(html)
      .toContain('<span role="listitem" class="vote-dot vote-dot--yes" aria-label="Alice: Yes"></span>');
    expect(html)
      .toContain('<span role="listitem" class="vote-dot vote-dot--no" aria-label="Bob: No"></span>');
    // The redesign keeps the dots but restores the three vote tables.
    expect(html)
      .toContain('<details id="own-team-votes" class="votes-details">');
    expect(html)
      .toContain('<h3 id="vote-summary-home-title">Home Team Votes</h3>');
    expect(html)
      .toContain('<h3 id="vote-summary-away-title">Away Team Votes</h3>');
  });

  it('renders inline team tallies and the sort control on the full edit page', () => {
    const html = renderToString(EditPage(baseProps()));

    expect(html)
      .toContain('<div class="team-tallies">');
    expect(html)
      .toContain('<span class="team-tally">Home Team: 1 (1/0/1)</span>');
    expect(html)
      .toContain('<span class="team-tally">Guest Team: 0 (0/0/0)</span>');
    expect(html)
      .toContain('role="radiogroup" aria-label="Sort by"');
    expect(html)
      .toContain('hx-get="/edit/test-session"');
  });
});

describe('EditPage sidebar roster and generator', () => {
  it('renders the roster management block and the date generator in the sidebar', () => {
    const html = renderToString(EditPage(baseProps()));

    expect(html)
      .toContain('<div id="team-management">');
    expect(html)
      .toContain('id="playerName"');
    expect(html)
      .toContain('id="playerNameAway"');
    expect(html)
      .toContain('class="generate-controls mt-2"');
    expect(html)
      .toContain('id="fromDate"');
    expect(html)
      .toContain('id="toDate"');
    expect(html)
      .toContain('id="generateVenueNumber"');
  });

  it('omits the old schedule heading and the match summary paragraph', () => {
    const html = renderToString(EditPage(baseProps()));

    expect(html)
      .not
      .toContain('<h2>Schedule</h2>');
    expect(html)
      .not
      .toContain('Match:');
  });
});

describe('EditPage generator memory key', () => {
  const home = {championship: 'MTTV 26/27', group: '219397', teamtable: '1732195'};
  const away = {championship: 'MTTV 26/27', group: '219397', teamtable: '1732193'};
  const expectedKey = `postpony-generator-${encodeURIComponent('MTTV 26/27|219397|1732195')}`;

  it('emits the memory key on the generator form when the organizer has an identity', () => {
    const session = buildSession({homeTeamIdentity: home, guestTeamIdentity: away});
    const html = renderToString(EditPage(baseProps({session})));

    expect(html)
      .toContain(`data-generator-memory-key="${expectedKey}"`);
  });

  it('omits the memory key on the full page when the organizer has no identity', () => {
    const html = renderToString(EditPage(baseProps()));

    expect(html)
      .not
      .toContain('data-generator-memory-key');
  });

  it('carries the memory key in a partial grid re-render', () => {
    const session = buildSession({homeTeamIdentity: home, guestTeamIdentity: away});
    const html = renderToString(EditGrid(baseProps({session})));

    expect(html)
      .toContain(`data-generator-memory-key="${expectedKey}"`);
  });

  it('omits the memory key in a partial grid re-render without an identity', () => {
    const html = renderToString(EditGrid(baseProps()));

    expect(html)
      .not
      .toContain('data-generator-memory-key');
  });
});

describe('buildEditPartialsData accepted flag', () => {
  it('exposes the accepted flag per proposed date', () => {
    const session = buildSession({
      proposedDates: [
        aProposedDate({
          id: 'pd-accepted',
          dateTimeRange: {start: '2026-09-01T20:00', end: '2026-09-01T22:00'},
          votable: true,
          accepted: true,
        }),
        aProposedDate({
          id: 'pd-plain',
          dateTimeRange: {start: '2026-09-15T20:00', end: '2026-09-15T22:00'},
          votable: true,
        }),
      ],
    });

    const data = buildEditPartialsData(session, 'en-US');

    expect(data.proposedDates)
      .toMatchObject([
        {id: 'pd-accepted', accepted: true},
        {id: 'pd-plain', accepted: false},
      ]);
  });
});
