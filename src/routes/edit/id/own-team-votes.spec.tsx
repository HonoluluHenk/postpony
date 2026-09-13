import { describe, expect, it } from 'vitest';
import { getTranslation } from '../../../locales';
import type { Player } from '../../../lib/models';
import { OwnTeamVotes, type OwnTeamVotesProps } from './own-team-votes';

const t = (key: any, params?: any): string => getTranslation('en-US', key, params);

const organizerPlayers: Player[] = [
  { id: 'p1', name: 'Voter', teamId: 'home' },
  { id: 'p2', name: 'SitsOut', teamId: 'home' },
];

const ownTeamResults: OwnTeamVotesProps['ownTeamResults'] = [
  {
    dateId: 'pd-1',
    display: '10.10.2026 19:00',
    votes: [
      { playerId: 'p1', playerName: 'Voter', vote: 'Yes' },
      { playerId: 'p2', playerName: 'SitsOut', vote: null },
    ],
    voted: 1,
    total: 2,
    nonVoters: [{ playerId: 'p2', playerName: 'SitsOut', joined: false }],
  },
];

function renderToString(node: unknown): string {
  if (node === null || node === undefined) {
    return '';
  }
  return (node as { toString(): string }).toString();
}

describe('OwnTeamVotes component', () => {
  it('collapses to null when there are no own-team results', () => {
    const result = OwnTeamVotes({ organizerPlayers, ownTeamResults: [], t });
    expect(result).toBeNull();
  });

  it('emits a hidden OOB clearing node when empty, so a partial swap clears a stale section', () => {
    const html = renderToString(OwnTeamVotes({ organizerPlayers, ownTeamResults: [], t, oob: true }));

    expect(html).toContain('<section id="own-team-votes" hx-swap-oob="true" hidden="">');
    expect(html).not.toContain('Your Team Votes');
  });

  it('renders the section with an h3 heading, player columns, and the voted column', () => {
    const node = OwnTeamVotes({ organizerPlayers, ownTeamResults, t });
    const html = renderToString(node);

    expect(html).toContain('<section id="own-team-votes" class="padding small-round surface-variant"');
    expect(html).toContain('<h3 id="own-team-votes-title">Your Team Votes</h3>');
    expect(html).toContain('<caption class="visually-hidden">Your Team Votes</caption>');
    expect(html).toContain('<th scope="col">Proposed Date &amp; Time</th>');
    expect(html).toContain('<th scope="col">Voter</th>');
    expect(html).toContain('<th scope="col">SitsOut</th>');
    expect(html).toContain('<th scope="col" class="num">Voted</th>');
    // The section is no longer a live region; announcements come from the
    // shared out-of-band status element instead.
    expect(html).not.toContain('aria-live');
  });

  it('wraps the table in a closed details with the heading inside the summary', () => {
    const node = OwnTeamVotes({ organizerPlayers, ownTeamResults, t });
    const html = renderToString(node);

    expect(html).toContain('<details>');
    expect(html).toContain('</details>');
    expect(html).toMatch(/<summary>\s*<h3 id="own-team-votes-title">Your Team Votes<\/h3>\s*<\/summary>/);
    // Closed by default: no `open` attribute on the details.
    expect(html).not.toContain('<details open');
    // The table sits inside the details, after the summary.
    expect(html).toMatch(/<\/summary>\s*<table>/);
  });

  it('keeps the disclosure closed when rendered as an out-of-band partial swap', () => {
    const html = renderToString(OwnTeamVotes({ organizerPlayers, ownTeamResults, t, oob: true }));

    expect(html).toContain('<details>');
    expect(html).toMatch(/<summary>\s*<h3 id="own-team-votes-title">Your Team Votes<\/h3>\s*<\/summary>/);
    expect(html).not.toContain('<details open');
    expect(html).toContain('hx-swap-oob="true"');
  });

  it('renders the vote cells, the N/M voted count, and the non-voter row', () => {
    const node = OwnTeamVotes({ organizerPlayers, ownTeamResults, t });
    const html = renderToString(node);

    expect(html).toContain('<th scope="row">10.10.2026 19:00</th>');
    expect(html).toContain('<td data-label="Voter">Yes</td>');
    expect(html).toContain('<span class="visually-hidden">No vote</span>');
    expect(html).toContain('<td data-label="Voted" class="num">1/2 voted</td>');
    expect(html).toContain('Not voted yet:');
    expect(html).toContain('SitsOut (not joined)');
  });

  it('puts a data label on every body cell matching its column header, so the stacked-table pattern applies', () => {
    const node = OwnTeamVotes({ organizerPlayers, ownTeamResults, t });
    const html = renderToString(node);

    // Player-column vote cells carry the player's name, matching the column header.
    expect(html).toContain('<td data-label="Voter">Yes</td>');
    // A no-vote cell keeps its player label so the stacked card still names the voter.
    expect(html).toContain('<td data-label="SitsOut">');
    // The voted-count cell carries the "Voted" column label.
    expect(html).toContain('<td data-label="Voted" class="num">1/2 voted</td>');
  });

  it('sets hx-swap-oob only when requested', () => {
    const oob = renderToString(OwnTeamVotes({ organizerPlayers, ownTeamResults, t, oob: true }));
    const plain = renderToString(OwnTeamVotes({ organizerPlayers, ownTeamResults, t }));

    expect(oob).toContain('hx-swap-oob="true"');
    expect(plain).not.toContain('hx-swap-oob');
  });

  it('supports a custom heading level and title', () => {
    const node = OwnTeamVotes({
      organizerPlayers,
      ownTeamResults,
      t,
      headingLevel: 2,
      title: 'Custom Votes',
    });
    const html = renderToString(node);

    expect(html).toContain('<h2 id="own-team-votes-title">Custom Votes</h2>');
    expect(html).toContain('<caption class="visually-hidden">Custom Votes</caption>');
  });
});
