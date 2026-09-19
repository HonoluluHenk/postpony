import { describe, expect, it } from 'vitest';
import { aSession } from './__test-utils__/builders';
import type { ClickTtTeamIdentity } from './models';
import { generatorMemoryKey } from './generator-memory';

const home: ClickTtTeamIdentity = {championship: 'MTTV 26/27', group: '219397', teamtable: '1732195'};
const away: ClickTtTeamIdentity = {championship: 'MTTV 26/27', group: '219397', teamtable: '1732193'};

describe('generatorMemoryKey', () => {
  it('uses the home identity when the organizer is the home team', () => {
    const session = aSession({
      organizerTeam: 'home',
      homeTeamIdentity: home,
      guestTeamIdentity: away,
    });

    expect(generatorMemoryKey(session))
      .toBe(`postpony-generator-${encodeURIComponent('MTTV 26/27|219397|1732195')}`);
  });

  it('uses the guest identity when the organizer is the away team', () => {
    const session = aSession({
      organizerTeam: 'away',
      homeTeamIdentity: home,
      guestTeamIdentity: away,
    });

    expect(generatorMemoryKey(session))
      .toBe(`postpony-generator-${encodeURIComponent('MTTV 26/27|219397|1732193')}`);
  });

  it('returns undefined when the organizer identity is absent', () => {
    const session = aSession({
      organizerTeam: 'home',
      homeTeamIdentity: undefined,
      guestTeamIdentity: away,
    });

    expect(generatorMemoryKey(session))
      .toBeUndefined();
  });

  it('returns undefined when the away organizer identity is absent', () => {
    const session = aSession({
      organizerTeam: 'away',
      homeTeamIdentity: home,
      guestTeamIdentity: undefined,
    });

    expect(generatorMemoryKey(session))
      .toBeUndefined();
  });
});
