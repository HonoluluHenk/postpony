import { describe, expect, it } from 'vitest';
import type { Player } from '../../../lib/models';
import { getTranslation, type TranslationKeys } from '../../../locales';
import { TeamSection, type TeamSectionProps } from './team-section';

const t = (key: TranslationKeys, params?: Record<string, string>): string =>
  getTranslation('en-US', key, params);

const homePlayerA: Player = {id: 'h1', name: 'Home A', teamId: 'home'};
const players: Player[] = [
  homePlayerA,
  {id: 'h2', name: 'Home B', teamId: 'home'},
  {id: 'a1', name: 'Away A', teamId: 'away'},
];

function baseProps(overrides: Partial<TeamSectionProps> = {}): TeamSectionProps {
  return {
    sessionId: 'session-1',
    players,
    organizerPlayers: [homePlayerA],
    ownTeamResults: [],
    t,
    ...overrides,
  };
}

function renderToString(node: unknown): string {
  if (node === null || node === undefined) {
    return '';
  }
  return (node as { toString(): string }).toString();
}

describe('TeamSection component', () => {
  it('renders the home and away player lists with their add forms', () => {
    const html = renderToString(TeamSection(baseProps()));

    expect(html)
      .toContain('<div id="team-management">');
    expect(html)
      .toContain('<h4>Home Team</h4>');
    expect(html)
      .toContain('<ul id="home-player-list" class="list" aria-label="Home Team">');
    expect(html)
      .toContain('<ul id="away-player-list" class="list" aria-label="Away Team">');
    expect(html)
      .toContain('Home A');
    expect(html)
      .toContain('Home B');
    expect(html)
      .toContain('Away A');
    expect(html)
      .toContain('hx-post="/edit/session-1/players"');
    expect(html)
      .toContain('hx-target="#edit-grid"');
    expect(html)
      .toContain('id="playerName"');
    expect(html)
      .toContain('id="playerNameAway"');
  });

  it('turns off autofill on the valid home and away name inputs', () => {
    const html = renderToString(TeamSection(baseProps()));

    expect(html)
      .toMatch(/id="playerName"[^>]*autocomplete="off"/);
    expect(html)
      .toMatch(/id="playerNameAway"[^>]*autocomplete="off"/);
  });

  it('keeps the invalid input and error text on the home field when the home form failed', () => {
    const html = renderToString(TeamSection(baseProps({
      playerName: 'x',
      teamId: 'home',
      error: 'Player name is required',
    })));

    expect(html)
      .toContain('class="field label border fill invalid"');
    expect(html)
      .toContain('value="x"');
    expect(html)
      .toContain('aria-invalid="true"');
    expect(html)
      .toContain('aria-describedby="playerName-error"');
    expect(html)
      .toContain('id="playerName-error"');
    expect(html)
      .toContain('>Player name is required</span>');
    expect(html)
      .not
      .toContain('id="playerNameAway-error"');
    expect(html)
      .toMatch(/id="playerName"[^>]*autocomplete="off"/);
  });

  it('keeps the invalid input on the away field when the away form failed', () => {
    const html = renderToString(TeamSection(baseProps({
      playerName: 'y',
      teamId: 'away',
      error: 'Player name is required',
    })));

    expect(html)
      .toContain('aria-describedby="playerNameAway-error"');
    expect(html)
      .toContain('id="playerNameAway-error"');
    expect(html)
      .toContain('value="y"');
    expect(html)
      .not
      .toContain('id="playerName-error"');
    expect(html)
      .toMatch(/id="playerNameAway"[^>]*autocomplete="off"/);
  });

  it('treats the home form as invalid when the failed team is unspecified', () => {
    const html = renderToString(TeamSection(baseProps({
      playerName: 'x',
      error: 'Player name is required',
    })));

    expect(html)
      .toContain('aria-describedby="playerName-error"');
    expect(html)
      .toContain('id="playerName-error"');
    expect(html)
      .not
      .toContain('id="playerNameAway-error"');
  });
});
