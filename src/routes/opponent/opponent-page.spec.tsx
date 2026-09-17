import { describe, expect, it } from 'vitest';
import { aPlayer, aProposedDate, aSession, aVote } from '../../lib/__test-utils__/builders';
import type { Postponement } from '../../lib/models';
import { getTranslation, inputFormat, languageOptions, type AppLocale, type TranslationKeys } from '../../locales';
import { OpponentPage, type OpponentDateItem, type OpponentPageProps } from './opponent';
import { buildOpponentViewData } from './render-opponent';

const BASE_URL = 'https://game-scheduler.localhost:3000';

function tFor(locale: AppLocale) {
  return (key: TranslationKeys, params?: Record<string, string>): string =>
    getTranslation(locale, key, params);
}

function pageProps(
  session: Postponement,
  locale: AppLocale = 'en-US',
  overrides: Partial<OpponentPageProps> = {},
): OpponentPageProps {
  return {
    t: tFor(locale),
    locale,
    isPartial: false,
    baseUrl: BASE_URL,
    inputFormat: inputFormat(locale),
    languageOptions: languageOptions(),
    ...buildOpponentViewData(session, locale),
    session,
    title: 'Opponent Captain',
    ...overrides,
  };
}

function renderToString(node: unknown): string {
  return (node as {
    toString(): string
  }).toString();
}

function clashingSession(): Postponement {
  return aSession({
    organizerTeam: 'home',
    homeTeam: 'Ostermundigen',
    guestTeam: 'Thun',
    players: [aPlayer({id: 'ap', name: 'Opponent', teamId: 'away'})],
    proposedDates: [
      aProposedDate({
        id: 'pd-clash',
        dateTimeRange: {start: '2026-09-01T20:00', end: '2026-09-01T22:00'},
        votable: true,
        clashes: {
          home: [{opponent: 'Organizer Opp', start: '2026-09-01T19:00'}],
          away: [{opponent: 'Own Opp', start: '2026-09-01T19:00'}],
        },
      }),
    ],
  });
}

describe('OpponentPage clash chips', () => {
  it('renders the own-side clash line without a home/away side prefix', () => {
    const html = renderToString(OpponentPage(pageProps(clashingSession())));

    expect(html)
      .toContain('<span class="chip chip--error">7:00 PM vs Own Opp</span>');
    expect(html)
      .not
      .toContain('Home:');
    expect(html)
      .not
      .toContain('Away:');
    expect(html)
      .not
      .toContain('Organizer Opp');
  });

  it('words the clash line in German for de-CH', () => {
    const html = renderToString(OpponentPage(pageProps(clashingSession(), 'de-CH')));

    expect(html)
      .toContain('gegen Own Opp');
    expect(html)
      .not
      .toContain('Heim:');
    expect(html)
      .not
      .toContain('Gast:');
  });

  it('renders the clean chip for a checked-clean date', () => {
    const session = aSession({
      organizerTeam: 'home',
      players: [aPlayer({id: 'ap', teamId: 'away'})],
      proposedDates: [
        aProposedDate({
          id: 'pd-clean',
          dateTimeRange: {start: '2026-09-01T20:00', end: '2026-09-01T22:00'},
          votable: true,
          clashes: {home: [], away: []},
        }),
      ],
    });
    const html = renderToString(OpponentPage(pageProps(session)));

    expect(html)
      .toContain('<span class="chip chip--clean">No other games</span>');
  });

  it('renders no clash UI at all for a date with no clash data', () => {
    const session = aSession({
      organizerTeam: 'home',
      players: [aPlayer({id: 'ap', teamId: 'away'})],
      proposedDates: [
        aProposedDate({
          id: 'pd-unchecked',
          dateTimeRange: {start: '2026-09-01T20:00', end: '2026-09-01T22:00'},
          votable: true,
        }),
      ],
    });
    const html = renderToString(OpponentPage(pageProps(session)));

    expect(html)
      .not
      .toContain('date-chips');
    expect(html)
      .not
      .toContain('No other games');
    expect(html)
      .not
      .toContain('Not checked');
    expect(html)
      .not
      .toContain('Venue empty');
  });

  it('never renders venue, occupancy, or organizer-schedule text', () => {
    const session = aSession({
      organizerTeam: 'home',
      homeTeam: 'Ostermundigen',
      guestTeam: 'Thun',
      players: [aPlayer({id: 'ap', teamId: 'away'})],
      proposedDates: [
        aProposedDate({
          id: 'pd-clash',
          dateTimeRange: {start: '2026-09-01T20:00', end: '2026-09-01T22:00'},
          votable: true,
          venueNumber: 2,
          venueOccupancy: {count: 2, matches: [{opponent: 'Port', start: '2026-09-01T19:30'}]},
          clashes: {
            home: [{opponent: 'Organizer Opp', start: '2026-09-01T19:00'}],
            away: [{opponent: 'Own Opp', start: '2026-09-01T19:00'}],
          },
        }),
      ],
    });
    const html = renderToString(OpponentPage(pageProps(session)));

    expect(html)
      .not
      .toContain('Ostermundigen');
    expect(html)
      .not
      .toContain('Organizer Opp');
    expect(html)
      .not
      .toContain('(2)');
    expect(html)
      .not
      .toContain('other games at this venue');
    expect(html)
      .not
      .toContain('Venue empty');
  });
});

describe('OpponentPage date cell', () => {
  it('renders the four-part date (weekday, month and day, time, year)', () => {
    const html = renderToString(OpponentPage(pageProps(clashingSession())));

    expect(html)
      .toContain('<span class="date-day">Tu</span>');
    expect(html)
      .toContain('<span class="date-num">September 1</span>');
    expect(html)
      .toContain('<span class="date-time">8:00 PM</span>');
    expect(html)
      .toContain('<span class="date-year">2026</span>');
  });
});

describe('OpponentPage row-level labels', () => {
  it('marks a clashing row with the clash-row class, group role, and clash label', () => {
    const html = renderToString(OpponentPage(pageProps(clashingSession())));

    expect(html)
      .toContain('class="date-row clash-row"');
    expect(html)
      .toContain('role="group"');
    expect(html)
      .toContain('aria-label="Schedule clash: Tu, Sep 1, 2026, 8:00 PM"');
  });

  it('announces a clean row as a clean group without the clash-row marker', () => {
    const session = aSession({
      organizerTeam: 'home',
      players: [aPlayer({id: 'ap', teamId: 'away'})],
      proposedDates: [
        aProposedDate({
          id: 'pd-clean',
          dateTimeRange: {start: '2026-09-01T20:00', end: '2026-09-01T22:00'},
          votable: true,
          clashes: {home: [], away: []},
        }),
      ],
    });
    const html = renderToString(OpponentPage(pageProps(session)));

    expect(html)
      .toContain('aria-label="No other games: Tu, Sep 1, 2026, 8:00 PM"');
    expect(html)
      .not
      .toContain('clash-row');
  });

  it('leaves an unchecked row unmarked with no group role', () => {
    const session = aSession({
      organizerTeam: 'home',
      players: [aPlayer({id: 'ap', teamId: 'away'})],
      proposedDates: [
        aProposedDate({
          id: 'pd-unchecked',
          dateTimeRange: {start: '2026-09-01T20:00', end: '2026-09-01T22:00'},
          votable: true,
        }),
      ],
    });
    const html = renderToString(OpponentPage(pageProps(session)));

    expect(html)
      .toContain('class="date-row"');
    expect(html)
      .not
      .toContain('role="group"');
    expect(html)
      .not
      .toContain('aria-label="Schedule clash:');
    expect(html)
      .not
      .toContain('aria-label="No other games:');
  });

  it('judges the row on the opponent side only when both sides clash', () => {
    const dates: OpponentDateItem[] = [
      {
        id: 'pd-both',
        display: 'Tu, Sep 1, 2026, 8:00 PM',
        dateTimeRange: {start: '2026-09-01T20:00', end: '2026-09-01T22:00'},
        ownClashes: [{opponent: 'Own Opp', start: '2026-09-01T19:00'}],
        opponentVotable: true,
        accepted: false,
        yes: 0,
        no: 0,
        ifNecessary: 0,
      },
    ];
    const session = clashingSession();
    const html = renderToString(OpponentPage(pageProps(session, 'en-US', {dates})));

    expect(html.match(/chip--error/g) ?? [])
      .toHaveLength(1);
    expect(html)
      .toContain('7:00 PM vs Own Opp');
  });
});

describe('OpponentPage team tally label', () => {
  it('prefixes the tally with the localized votes label', () => {
    const session = aSession({
      organizerTeam: 'home',
      homeTeam: 'Ostermundigen',
      guestTeam: 'Thun',
      players: [aPlayer({id: 'ap', teamId: 'away'})],
      proposedDates: [aProposedDate({id: 'pd-1'})],
      votes: [aVote({id: 'v1', proposedDateId: 'pd-1', participantId: 'ap', type: 'No'})],
    });

    expect(renderToString(OpponentPage(pageProps(session))))
      .toContain('Votes team Thun: 0 (0/0/1)');
    expect(renderToString(OpponentPage(pageProps(session, 'de-CH'))))
      .toContain('Stimmen der Mannschaft Thun: 0 (0/0/1)');
  });
});

describe('OpponentPage toggle accessible names', () => {
  it('includes each row\'s date so repeated switches are distinguishable', () => {
    const session = aSession({
      organizerTeam: 'home',
      players: [aPlayer({id: 'ap', teamId: 'away'})],
      proposedDates: [
        aProposedDate({id: 'pd-a', dateTimeRange: {start: '2026-09-01T20:00', end: '2026-09-01T22:00'}}),
        aProposedDate({id: 'pd-b', dateTimeRange: {start: '2026-09-08T20:00', end: '2026-09-08T22:00'}}),
      ],
    });
    const html = renderToString(OpponentPage(pageProps(session)));

    expect(html)
      .toContain('aria-label="Your team may vote on Tu, Sep 1, 2026, 8:00 PM"');
    expect(html)
      .toContain('aria-label="Your team may vote on Tu, Sep 8, 2026, 8:00 PM"');
    expect(html)
      .toContain('aria-label="Accept Tu, Sep 1, 2026, 8:00 PM — the organizer may confirm it"');
    expect(html)
      .toContain('aria-label="Accept Tu, Sep 8, 2026, 8:00 PM — the organizer may confirm it"');
  });
});

describe('OpponentPage team invitation link', () => {
  it('renders the opponent team\'s join link with its player token and own-team label', () => {
    const session = aSession({
      organizerTeam: 'home',
      homeTeam: 'Ostermundigen',
      guestTeam: 'Thun',
      players: [aPlayer({id: 'ap', teamId: 'away'})],
    });
    const html = renderToString(OpponentPage(pageProps(session)));

    expect(html)
      .toContain(`href="${BASE_URL}/join/test-session/away?token=away-player-pw"`);
    expect(html)
      .toContain('My team invitation link (Thun)');
    expect(html)
      .toContain(`data-copy="${BASE_URL}/join/test-session/away?token=away-player-pw"`);
    expect(html)
      .toContain('aria-label="Copy to clipboard"');
    expect(html)
      .not
      .toContain(`href="${BASE_URL}/join/test-session/home?token=home-player-pw"`);
  });

  it('points at the home side when the organizer sits on the away side', () => {
    const session = aSession({
      organizerTeam: 'away',
      homeTeam: 'Ostermundigen',
      guestTeam: 'Thun',
    });
    const html = renderToString(OpponentPage(pageProps(session)));

    expect(html)
      .toContain(`href="${BASE_URL}/join/test-session/home?token=home-player-pw"`);
    expect(html)
      .toContain('My team invitation link (Ostermundigen)');
  });

  it('renders the plain label when the opponent side has no team name', () => {
    const session = aSession({organizerTeam: 'home'});
    session.homeTeam = undefined;
    session.guestTeam = undefined;
    const html = renderToString(OpponentPage(pageProps(session)));

    expect(html)
      .toContain(`href="${BASE_URL}/join/test-session/away?token=away-player-pw"`);
    expect(html)
      .toContain('>My team invitation link</a>');
  });
});

describe('OpponentPage sort control', () => {
  const sortDates = [
    aProposedDate({
      id: 'pd-a',
      dateTimeRange: {start: '2026-09-01T20:00', end: '2026-09-01T22:00'},
      votable: true,
    }),
    aProposedDate({
      id: 'pd-b',
      dateTimeRange: {start: '2026-09-08T20:00', end: '2026-09-08T22:00'},
      votable: true,
    }),
    aProposedDate({
      id: 'pd-c',
      dateTimeRange: {start: '2026-09-15T20:00', end: '2026-09-15T22:00'},
      votable: true,
    }),
    aProposedDate({
      id: 'pd-d',
      dateTimeRange: {start: '2026-09-22T20:00', end: '2026-09-22T22:00'},
      votable: true,
    }),
  ];
  // Opponent-side availability: pd-a=1, pd-b=2, pd-c=2 (yes + if-necessary), pd-d=0.
  const sortVotes = [
    aVote({proposedDateId: 'pd-a', participantId: 'ap1', type: 'Yes'}),
    aVote({proposedDateId: 'pd-b', participantId: 'ap1', type: 'Yes'}),
    aVote({proposedDateId: 'pd-b', participantId: 'ap2', type: 'Yes'}),
    aVote({proposedDateId: 'pd-c', participantId: 'ap1', type: 'Yes'}),
    aVote({proposedDateId: 'pd-c', participantId: 'ap2', type: 'IfNecessary'}),
  ];
  const session = aSession({
    organizerTeam: 'home',
    players: [aPlayer({id: 'ap1', teamId: 'away'}), aPlayer({id: 'ap2', teamId: 'away'})],
    proposedDates: sortDates,
    votes: sortVotes,
  });

  it('renders the Date/Availability radiogroup that requests the opponent view', () => {
    const html = renderToString(OpponentPage(pageProps(session)));

    expect(html)
      .toContain('class="sort-control" role="radiogroup" aria-label="Sort by"');
    expect(html)
      .toContain('name="sort" value="date" checked');
    expect(html)
      .toContain('name="sort" value="availability"');
    expect(html)
      .toContain('hx-get="/opponent/test-session"');
    expect(html)
      .toContain('hx-target="#opponent-view"');
    expect(html)
      .toContain('hx-push-url="true"');
  });

  it('groups by the opponent team availability bands when sorted by availability', () => {
    const html = renderToString(OpponentPage(pageProps(session, 'en-US', {sort: 'availability'})));

    expect(html)
      .toContain('<span>Reduced strength (2)</span>');
    expect(html)
      .toContain('<span>Not playable (2)</span>');
    // The rendered bands explain themselves in tooltips on the shared heading.
    for (const [kind, tooltip] of [
      ['reducedStrength', 'Below full strength, but enough to play short-handed.'],
      ['notPlayable', 'Not enough available players, or a date you closed.'],
    ] as const)
    {
      expect(html)
        .toContain(`id="rail-group-${kind}-tooltip"`);
      expect(html)
        .toContain(`aria-describedby="rail-group-${kind}-tooltip"`);
      expect(html)
        .toContain(tooltip);
    }
    // No band without dates is rendered; the availability sort never shows ISO weeks.
    expect(html)
      .not
      .toContain('Full strength (');
    expect(html)
      .not
      .toContain('>Week ');

    // Within "Reduced strength" Sep 8 precedes Sep 15; not playable follows.
    const sep8 = html.indexOf('>September 8<');
    const sep15 = html.indexOf('>September 15<');
    const sep1 = html.indexOf('>September 1<');
    const sep22 = html.indexOf('>September 22<');
    expect(sep8)
      .toBeGreaterThan(-1);
    expect(sep8)
      .toBeLessThan(sep15);
    expect(sep15)
      .toBeLessThan(sep1);
    expect(sep1)
      .toBeLessThan(sep22);
  });

  it('restores ISO-week grouping when sorted by date', () => {
    const html = renderToString(OpponentPage(pageProps(session, 'en-US', {sort: 'date'})));

    expect(html)
      .toContain('Week 36');
    expect(html)
      .toContain('Week 37');
    expect(html)
      .toContain('Week 38');
    expect(html)
      .toContain('Week 39');
    expect(html)
      .not
      .toContain('Not playable (');
    // Week heads are plain headings: no band tooltip, nothing keyboard-focusable.
    expect(html)
      .not
      .toContain('rail-group-');
    expect(html)
      .not
      .toContain('tabindex');
  });

  it('drives the availability bands from the opponent team when the organizer is away', () => {
    const awaySession = aSession({
      organizerTeam: 'away',
      players: [aPlayer({id: 'hp1', teamId: 'home'}), aPlayer({id: 'hp2', teamId: 'home'})],
      proposedDates: sortDates,
      votes: [aVote({proposedDateId: 'pd-a', participantId: 'hp1', type: 'Yes'})],
    });
    const html = renderToString(OpponentPage(pageProps(awaySession, 'en-US', {sort: 'availability'})));

    expect(html)
      .toContain('<span>Not playable (4)</span>');
    expect(html)
      .not
      .toContain('<span>Reduced strength (');
    // Only pd-a has home availability, so it leads the list.
    expect(html.indexOf('>September 1<'))
      .toBeLessThan(html.indexOf('>September 8<'));
  });

  it('hides the sort control when only one date exists', () => {
    const single = aSession({
      organizerTeam: 'home',
      proposedDates: [aProposedDate({id: 'pd-1', votable: true})],
    });
    const html = renderToString(OpponentPage(pageProps(single)));

    expect(html)
      .not
      .toContain('sort-control');
    expect(html)
      .not
      .toContain('role="radiogroup"');
  });
});

describe('OpponentPage schedule re-check', () => {
  const identities = {
    home: {championship: 'MTTV 26/27', group: '219397', teamtable: '1732195'},
    away: {championship: 'MTTV 26/27', group: '219397', teamtable: '1732193'},
  };

  function checkableSession(): Postponement {
    return aSession({
      organizerTeam: 'home',
      homeTeamIdentity: identities.home,
      guestTeamIdentity: identities.away,
      players: [aPlayer({id: 'ap', teamId: 'away'})],
      proposedDates: [
        aProposedDate({
          id: 'pd-1',
          dateTimeRange: {start: '2026-09-01T20:00', end: '2026-09-01T22:00'},
          votable: true,
          clashes: {home: [], away: []},
        }),
      ],
    });
  }

  it('renders the re-check button when the opponent side has a team identity', () => {
    const html = renderToString(OpponentPage(pageProps(checkableSession())));

    expect(html)
      .toContain('/opponent/test-session/refresh-clashes');
    expect(html)
      .toContain('Refresh Schedule Check');
    expect(html)
      .toContain('aria-describedby="opponent-refresh-clash-tooltip"');
    expect(html)
      .toContain('<span class="tooltip" role="tooltip" id="opponent-refresh-clash-tooltip">');
    expect(html)
      .toContain('click-tt.ch schedules for clashes with these dates.');
  });

  it('offers no re-check button when the opponent side has no team identity', () => {
    const session = checkableSession();
    session.guestTeamIdentity = undefined;
    const html = renderToString(OpponentPage(pageProps(session)));

    expect(html)
      .not
      .toContain('refresh-clashes');
    expect(html)
      .not
      .toContain('Refresh Schedule Check');
  });

  it('offers no re-check button when no dates exist', () => {
    const session = checkableSession();
    session.proposedDates = [];
    const html = renderToString(OpponentPage(pageProps(session)));

    expect(html)
      .not
      .toContain('refresh-clashes');
  });

  it('renders the refresh-failed warning when the re-check failed on a previous snapshot', () => {
    const html = renderToString(OpponentPage(pageProps(checkableSession(), 'en-US', {refreshError: true})));

    expect(html)
      .toContain('role="alert"');
    expect(html)
      .toContain('showing the previous results');
  });
});
