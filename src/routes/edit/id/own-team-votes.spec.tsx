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
    expect(html).toContain('<caption>Your Team Votes</caption>');
    expect(html).toContain('<th scope="col">Proposed Date &amp; Time</th>');
    expect(html).toContain('<th scope="col">Voter</th>');
    expect(html).toContain('<th scope="col">SitsOut</th>');
    expect(html).toContain('<th scope="col">Voted</th>');
  });

  it('renders the vote cells, the N/M voted count, and the non-voter row', () => {
    const node = OwnTeamVotes({ organizerPlayers, ownTeamResults, t });
    const html = renderToString(node);

    expect(html).toContain('<th scope="row">10.10.2026 19:00</th>');
    expect(html).toContain('<td>Yes</td>');
    expect(html).toContain('<span class="visually-hidden">No vote</span>');
    expect(html).toContain('1/2 voted');
    expect(html).toContain('Not voted yet:');
    expect(html).toContain('SitsOut (not joined)');
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
    expect(html).toContain('<caption>Custom Votes</caption>');
  });
});
