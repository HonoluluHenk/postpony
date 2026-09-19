import type { Postponement } from './models';

/**
 * Storage-key prefix the generator "slate memory" uses, kept distinct from
 * ADR-0013's `postpony-player-` namespace. The slate follows the organizer
 * team's click-tt identity (ADR-0022) rather than the session, so the same
 * team recalls its times whether it plays home or away.
 */
export const GENERATOR_MEMORY_PREFIX = 'postpony-generator-';

/**
 * Derives the generator-memory storage key from the organizer team's click-tt
 * identity (ADR-0022), or `undefined` when that identity is absent (a
 * hand-entered match per ADR-0017). Side-independent: `organizerTeam` picks
 * the home or guest identity, so the key is deterministic across both sides.
 */
export function generatorMemoryKey(session: Postponement): string | undefined {
  const identity = session.organizerTeam === 'home' ? session.homeTeamIdentity : session.guestTeamIdentity;
  if (identity === undefined) {
    return undefined;
  }
  return `${GENERATOR_MEMORY_PREFIX}${encodeURIComponent(
    `${identity.championship}|${identity.group}|${identity.teamtable}`,
  )}`;
}
