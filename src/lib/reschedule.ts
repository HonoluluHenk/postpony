import { generateId } from './crypto-utils';
import type { Player, ProposedDate, RescheduleSession, Vote } from './models';

export type Team = 'home' | 'away';

export interface VoteTally {
  yes: number;
  no: number;
  maybe: number;
}

/**
 * The Reschedule domain module: the rules for one postponement, as pure operations that
 * take a session and return a new session (handlers write it back to the store).
 *
 * Non-determinism sits behind two overridable methods — `newId` and `now` — with real
 * defaults in production; tests subclass and override them for deterministic assertions.
 * The class is the test surface, so tests never construct a Hono context.
 */
export class Reschedule {

  newId(): string {
    return generateId();
  }

  // ponytail: no operation timestamps yet; now() is wired for the first timestamped
  // operation (status transitions / audit) so the seam is ready when it lands.
  now(): string {
    return new Date().toISOString();
  }

  /**
   * Registers a participant on a team: matches an existing player by name (case-insensitive)
   * or by id, or creates a new one. Returns the (possibly unchanged) session and the resolved
   * player, or `undefined` when neither a name nor a valid selection was given.
   */
  registerParticipant(
    session: RescheduleSession,
    team: Team,
    input: {
      name?: string;
      playerId?: string
    },
  ): {
    session: RescheduleSession;
    player: Player | undefined
  }
  {
    const teamPlayers = session.players.filter((p) => p.teamId === team);

    const name = (input.name ?? '').trim();
    if (name) {
      const existing = teamPlayers.find((p) => p.name.toLowerCase() === name.toLowerCase());
      if (existing) {
        return {session, player: existing};
      }
      const player: Player = {id: this.newId(), name, teamId: team};
      return {session: {...session, players: [...session.players, player]}, player};
    }

    const selectedId = input.playerId ?? '';
    if (selectedId) {
      return {session, player: teamPlayers.find((p) => p.id === selectedId)};
    }

    return {session, player: undefined};
  }

  /**
   * Adds a new home-team player from the edit view.
   */
  addPlayer(
    session: RescheduleSession,
    name: string,
    teamId: Team = 'home',
  ): {
    session: RescheduleSession;
    player: Player
  }
  {
    const player: Player = {id: this.newId(), name, teamId};
    return {session: {...session, players: [...session.players, player]}, player};
  }

  /**
   * Adds a Proposed Date. `start` must already be a normalized ISO datetime string.
   */
  proposeDate(
    session: RescheduleSession,
    start: string,
    proposerId: string,
  ): {
    session: RescheduleSession;
    proposedDate: ProposedDate
  }
  {
    // Placeholder: the UI collects a single instant, not a duration, so start and end
    // match pending a real duration model.
    const proposedDate: ProposedDate = {
      id: this.newId(),
      sessionId: session.id,
      dateTimeRange: {start, end: start},
      proposerId,
      awayTeamVotable: false,
    };
    return {session: {...session, proposedDates: [...session.proposedDates, proposedDate]}, proposedDate};
  }

  /**
   * Records or updates a participant's Vote on a Proposed Date. At most one Vote per
   * participant per Proposed Date; re-voting updates the existing Vote.
   */
  castVote(
    session: RescheduleSession,
    proposedDateId: string,
    participantId: string,
    type: Vote['type'],
  ): RescheduleSession {
    const existing = session.votes.find(
      (v) => v.proposedDateId === proposedDateId && v.participantId === participantId,
    );

    if (existing) {
      const votes = session.votes.map((v) => (v === existing ? {...v, type} : v));
      return {...session, votes};
    }

    const vote: Vote = {id: this.newId(), proposedDateId, participantId, type};
    return {...session, votes: [...session.votes, vote]};
  }

  /**
   * Aggregates Votes per Proposed Date, keyed by Proposed Date id.
   * When `team` is provided, only counts votes from participants on that team.
   */
  tally(session: RescheduleSession, team?: Team): Record<string, VoteTally> {
    const teamPlayerIds = team
                          ? new Set(session.players.filter((p) => p.teamId === team)
        .map((p) => p.id))
                          : null;

    const result: Record<string, VoteTally> = {};
    for (const pd of session.proposedDates) {
      const dateVotes = session.votes.filter(
        (v) => v.proposedDateId === pd.id && (!teamPlayerIds || teamPlayerIds.has(v.participantId)),
      );
      result[pd.id] = {
        yes: dateVotes.filter((v) => v.type === 'Yes').length,
        no: dateVotes.filter((v) => v.type === 'No').length,
        maybe: dateVotes.filter((v) => v.type === 'Maybe').length,
      };
    }
    return result;
  }

  /**
   * Computes per-team tallies for the organizer view.
   */
  splitTallies(session: RescheduleSession): {
    home: Record<string, VoteTally>;
    away: Record<string, VoteTally>
  }
  {
    return {
      home: this.tally(session, 'home'),
      away: this.tally(session, 'away'),
    };
  }

  /**
   * Sets whether a Proposed Date is votable by the away team.
   */
  setAwayTeamVotable(
    session: RescheduleSession,
    proposedDateId: string,
    votable: boolean,
  ): RescheduleSession {
    const proposedDates = session.proposedDates.map((pd) =>
      pd.id === proposedDateId ? {...pd, awayTeamVotable: votable} : pd,
    );
    return {...session, proposedDates};
  }

  /**
   * Sets the venue overlap limit.
   */
  setVenueLimit(
    session: RescheduleSession,
    maxOverlaps: number | undefined,
  ): RescheduleSession {
    return {...session, maxOverlaps};
  }

}
