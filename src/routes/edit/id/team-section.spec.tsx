import { describe, expect, it } from 'vitest';
import { getTranslation } from '../../../locales';
import type { Player } from '../../../lib/models';
import { TeamSection, TeamSectionPartial, type TeamSectionProps } from './team-section';

const t = (key: any, params?: any): string => getTranslation('en-US', key, params);

const homePlayerA: Player = { id: 'h1', name: 'Home A', teamId: 'home' };
const players: Player[] = [
  homePlayerA,
  { id: 'h2', name: 'Home B', teamId: 'home' },
  { id: 'a1', name: 'Away A', teamId: 'away' },
];

function baseProps(): TeamSectionProps {
  return {
    sessionId: 'session-1',
    players,
    organizerPlayers: [homePlayerA],
    ownTeamResults: [],
    t,
  };
}

function renderToString(node: unknown): string {
  if (node === null || node === undefined) {
    return '';
  }
  return (node as { toString(): string }).toString();
}

describe('TeamSection component', () => {
  it('renders the home and away player lists with their forms', () => {
    const html = renderToString(TeamSection(baseProps()));

    expect(html).toContain('<section id="team-management" class="padding small-round surface-variant s12 m6"');
    expect(html).toContain('<h3 tabindex="-1">Players</h3>');
    expect(html).toContain('<ul id="home-player-list" class="list" aria-label="Home Team">');
    expect(html).toContain('<ul id="away-player-list" class="list" aria-label="Away Team">');
    expect(html).toContain('Home A');
    expect(html).toContain('Home B');
    expect(html).toContain('Away A');
    expect(html).toContain('hx-post="/edit/session-1/players"');
    expect(html).toContain('hx-target="#team-management"');
  });

  it('keeps the invalid input and error text on the home field when the home form failed', () => {
    const html = renderToString(TeamSection({
      ...baseProps(),
      playerName: 'x',
      teamId: 'home',
      error: 'Player name is required',
    }));

    expect(html).toContain('class="field label border fill invalid"');
    expect(html).toContain('value="x"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-describedby="playerName-error"');
    expect(html).toContain('id="playerName-error"');
    expect(html).toContain('>Player name is required</span>');
    expect(html).not.toContain('id="playerNameAway-error"');
  });

  it('keeps the invalid input on the away field when the away form failed', () => {
    const html = renderToString(TeamSection({
      ...baseProps(),
      playerName: 'y',
      teamId: 'away',
      error: 'Player name is required',
    }));

    expect(html).toContain('aria-describedby="playerNameAway-error"');
    expect(html).toContain('id="playerNameAway-error"');
    expect(html).toContain('value="y"');
    expect(html).not.toContain('id="playerName-error"');
  });
});

describe('TeamSectionPartial', () => {
  it('renders the section with its out-of-band error container and own-team votes', () => {
    const html = renderToString(TeamSectionPartial({
      ...baseProps(),
      ownTeamResults: [
        {
          dateId: 'pd-1',
          display: '10.10.2026 19:00',
          votes: [{playerId: 'h1', playerName: 'Home A', vote: 'Yes'}],
          voted: 1,
          total: 1,
          nonVoters: [],
        },
      ],
    }));

    expect(html).toContain('id="error-container" hx-swap-oob="true"');
    expect(html).toContain('id="team-management"');
    expect(html).toContain('<section id="own-team-votes" class="padding small-round surface-variant" hx-swap-oob="true"');
  });
});
