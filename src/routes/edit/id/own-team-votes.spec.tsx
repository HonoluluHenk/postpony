import { describe, expect, it } from 'vitest';
import type { Player } from '../../../lib/models';
import type { OwnTeamDateResults } from '../../../lib/postponement';
import { getTranslation, type TranslationKeys } from '../../../locales';
import { OwnTeamVotes, type OwnTeamVotesProps } from './own-team-votes';

const t = (key: TranslationKeys, params?: Record<string, string>): string =>
  getTranslation('en-US', key, params);

const organizerPlayers: Player[] = [
  {id: 'h1', name: 'Alice', teamId: 'home'},
  {id: 'h2', name: 'Bob', teamId: 'home'},
];

const ownTeamResults: (OwnTeamDateResults & {display: string})[] = [
  {
    dateId: 'pd-1',
    display: 'Tue, Sep 1, 2026, 8:00 PM',
    votes: [
      {playerId: 'h1', playerName: 'Alice', vote: 'Yes'},
      {playerId: 'h2', playerName: 'Bob', vote: null},
    ],
    voted: 1,
    total: 2,
    nonVoters: [{playerId: 'h2', playerName: 'Bob', joined: false}],
  },
];

function baseProps(overrides: Partial<OwnTeamVotesProps> = {}): OwnTeamVotesProps {
  return {organizerPlayers, ownTeamResults, t, ...overrides};
}

function renderToString(node: unknown): string {
  if (node === null || node === undefined) {
    return '';
  }
  return (node as { toString(): string }).toString();
}

describe('OwnTeamVotes component', () => {
  it('renders the per-player table in a closed disclosure', () => {
    const html = renderToString(OwnTeamVotes(baseProps()));

    expect(html)
      .toContain('<details id="own-team-votes" class="votes-details">');
    expect(html)
      .toContain('<summary>Your Team Votes</summary>');
    expect(html)
      .toContain('<caption class="visually-hidden">Your Team Votes</caption>');
    expect(html)
      .toContain('<th scope="col">Alice</th>');
    expect(html)
      .toContain('<th scope="col">Bob</th>');
    expect(html)
      .toContain('<td data-label="Alice">Yes</td>');
    // A missing vote renders the visually-hidden "No vote" plus a dash.
    expect(html)
      .toContain('<span class="visually-hidden">No vote</span>');
    expect(html)
      .toContain('>1/2 voted<');
    expect(html)
      .toContain('Not voted yet: Bob (not joined)');
    // Closed by default: no `open` attribute on the disclosure.
    expect(html)
      .not
      .toContain('<details open');
  });

  it('returns null when there are no own-team results', () => {
    expect(OwnTeamVotes(baseProps({ownTeamResults: []})))
      .toBeNull();
  });
});
