import thenby from 'thenby';
import type { AppLocale } from '../locales';
import { generateId } from './crypto-utils';
import type { Player, Postponement, ProposedDate, Team, Vote } from './models';
import { formatIsoToLocaleTokens } from './temporal-utils';

// tsx resolves 'thenby' to its CJS build, whose named export (firstBy)
// the ESM loader doesn't detect; the real function always hangs off the default,
// so read it off there. Works under node-ESM, tsx, and vitest alike.
const firstBy = (thenby as {
  firstBy?: typeof thenby
}).firstBy ?? thenby;

export interface VoteTally {
  yes: number;
  no: number;
  maybe: number;
}

/**
 * Derives a Postponement's display name from its typed match details:
 * "Home vs Guest – <original date/time>" in the given locale's input tokens
 * (e.g. `Thun vs Ostermundigen – 29.08.2026 16:00`). Shared by the manual and
 * click-tt creation paths so both name the session identically.
 */
export function derivePostponementName(
  homeTeam: string,
  guestTeam: string,
  originalMatchDateTime: string | undefined,
  locale: AppLocale,
): string {
  const dateTime = originalMatchDateTime
                   ? formatIsoToLocaleTokens(originalMatchDateTime, locale)
                   : '';
  const base = `${homeTeam} vs ${guestTeam}`;
  return dateTime ? `${base} – ${dateTime}` : base;
}

/**
 * The stable order every on-screen Proposed Date list renders in: ascending by
 * start date/time, with the id as a deterministic tie-break for identical
 * starts (e.g. a re-proposed duplicate).
 */
export function sortedProposedDates(dates: readonly ProposedDate[]): ProposedDate[] {
  return [...dates].sort(
    firstBy((pd: ProposedDate) => pd.dateTimeRange.start)
      .thenBy((pd: ProposedDate) => pd.id),
  );
}

/**
 * The Postponement domain module: the rules for one postponement, as pure operations that
 * take a session and return a new session (handlers write it back to the store).
 *
 * Non-determinism sits behind two overridable methods — `newId` and `now` — with real
 * defaults in production; tests subclass and override them for deterministic assertions.
 * The class is the test surface, so tests never construct a Hono context.
 */
export class PostponementRules {

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
    session: Postponement,
    team: Team,
    input: {
      name?: string;
      playerId?: string
    },
  ): {
    session: Postponement;
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
    session: Postponement,
    name: string,
    teamId: Team = 'home',
  ): {
    session: Postponement;
    player: Player
  }
  {
    const player: Player = {id: this.newId(), name, teamId};
    return {session: {...session, players: [...session.players, player]}, player};
  }

  /**
   * Adds a Proposed Date. `start` must already be a normalized ISO datetime string.
   * The first date moves the session from `Draft` to `Voting`; later adds keep `Voting`.
   * New dates are votable by both teams immediately. A `venueNumber` is stored when
   * given; absence leaves the field undefined (read-time default: venue 1).
   */
  proposeDate(
    session: Postponement,
    start: string,
    proposerId: string,
    venueNumber?: number,
  ): {
    session: Postponement;
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
      votable: true,
      ...(venueNumber !== undefined ? {venueNumber} : {}),
    };
    return {
      session: {
        ...session,
        status: session.status === 'Draft' ? 'Voting' : session.status,
        proposedDates: [...session.proposedDates, proposedDate],
      },
      proposedDate,
    };
  }

  /**
   * Records or updates a participant's Vote on a Proposed Date. At most one Vote per
   * participant per Proposed Date; re-voting updates the existing Vote.
   */
  castVote(
    session: Postponement,
    proposedDateId: string,
    participantId: string,
    type: Vote['type'],
  ): Postponement {
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
  tally(session: Postponement, team?: Team): Record<string, VoteTally> {
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
  splitTallies(session: Postponement): {
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
   * Returns the Proposed Dates that are open for voting, in ascending date
   * order. The single source of truth for "which dates can be voted on": the vote poll
   * filter and the vote guard must both call this so they cannot drift apart.
   */
  votableDates(session: Postponement): ProposedDate[] {
    return sortedProposedDates(session.proposedDates.filter((pd) => pd.votable));
  }

  /**
   * Sets whether a Proposed Date is open for voting by either team.
   */
  setVotable(
    session: Postponement,
    proposedDateId: string,
    votable: boolean,
  ): Postponement {
    const proposedDates = session.proposedDates.map((pd) =>
      pd.id === proposedDateId ? {...pd, votable} : pd,
    );
    return {...session, proposedDates};
  }

  /**
   * Locks a date as final: sets `confirmedProposedDateId` and moves the session to
   * `Confirmed`. A no-op for any date that is not `votable` or unknown.
   * Idempotent — confirming an already-confirmed date leaves the session unchanged.
   */
  confirmDate(
    session: Postponement,
    proposedDateId: string,
  ): Postponement {
    const date = session.proposedDates.find((pd) => pd.id === proposedDateId);
    if (!date?.votable) {
      return session;
    }
    return {...session, status: 'Confirmed', confirmedProposedDateId: proposedDateId};
  }

  /**
   * Reopens a Confirmed session back to `Voting`. The locked date stays as history in
   * `confirmedProposedDateId`; all votes and per-date votable flags are kept.
   */
  reopen(session: Postponement): Postponement {
    return {
      ...session,
      status: 'Voting',
      reopenCount: session.reopenCount + 1,
    };
  }

  /**
   * Deletes a Proposed Date and cascade-deletes its Votes. A no-op for an unknown
   * date id, so deleting twice or deleting a never-existing date leaves the session
   * unchanged. Status is left untouched: the organizer decides what happens next.
   * If the deleted date is the confirmed-history date (after a reopen), the dangling
   * `confirmedProposedDateId` is cleared with it.
   */
  deleteProposedDate(
    session: Postponement,
    proposedDateId: string,
  ): Postponement {
    if (!session.proposedDates.some((pd) => pd.id === proposedDateId)) {
      return session;
    }
    return {
      ...session,
      proposedDates: session.proposedDates.filter((pd) => pd.id !== proposedDateId),
      votes: session.votes.filter((v) => v.proposedDateId !== proposedDateId),
      confirmedProposedDateId:
        session.confirmedProposedDateId === proposedDateId
        ? undefined
        : session.confirmedProposedDateId,
    };
  }

  /**
   * Own-team completion per Proposed Date, keyed by date id. "Voted" counts team players
   * with a Vote on that date (any type); `total` is all team players — roster plus any
   * added names, joined or not. `nonVoters` lists the team players without a Vote on that
   * date; `joined` marks whether the player ever cast a Vote anywhere in the session.
   */
  teamCompletion(session: Postponement, team: Team): Record<string, DateCompletion> {
    const teamPlayers = session.players.filter((p) => p.teamId === team);
    const playerIds = new Set(teamPlayers.map((p) => p.id));

    // ponytail: "joined" is inferred from having cast any vote; there is no explicit
    // joined flag yet, so a registered-but-never-voted player is indistinguishable from
    // a never-joined roster player. Upgrade path: persist a joined marker on Player.
    const joinedIds = new Set(
      session.votes.filter((v) => playerIds.has(v.participantId))
        .map((v) => v.participantId),
    );

    const result: Record<string, DateCompletion> = {};
    for (const pd of session.proposedDates) {
      const dateVoterIds = new Set(
        session.votes.filter((v) => v.proposedDateId === pd.id)
          .map((v) => v.participantId),
      );
      const voted = teamPlayers.filter((p) => dateVoterIds.has(p.id)).length;
      const nonVoters = teamPlayers
        .filter((p) => !dateVoterIds.has(p.id))
        .map((player) => ({
          playerId: player.id,
          playerName: player.name,
          joined: joinedIds.has(player.id),
        }));
      result[pd.id] = {voted, total: teamPlayers.length, nonVoters};
    }
    return result;
  }

  /**
   * View data for the organizer's own-team completion table: per Proposed Date, the vote
   * type (or `null` for "no vote") of every team player in roster order, plus the per-date
   * "N/M voted" count and the non-voter list with the never-joined marking. Reuses
   * `teamCompletion` for the count and the non-voter list.
   */
  ownTeamResults(session: Postponement, team: Team): OwnTeamDateResults[] {
    const teamPlayers = session.players.filter((p) => p.teamId === team);
    const teamPlayerIds = new Set(teamPlayers.map((p) => p.id));
    const completion = this.teamCompletion(session, team);

    return sortedProposedDates(session.proposedDates)
      .map((pd) => {
        const voteByPlayerId = new Map(
          session.votes
            .filter((v) => v.proposedDateId === pd.id && teamPlayerIds.has(v.participantId))
            .map((v) => [v.participantId, v.type]),
        );
        const dateCompletion = completion[pd.id] ?? {
          voted: 0,
          total: teamPlayers.length,
          nonVoters: [],
        };
        return {
          dateId: pd.id,
          votes: teamPlayers.map((p) => ({
            playerId: p.id,
            playerName: p.name,
            vote: voteByPlayerId.get(p.id) ?? null,
          })),
          voted: dateCompletion.voted,
          total: dateCompletion.total,
          nonVoters: dateCompletion.nonVoters,
        };
      });
  }

}

export interface NonVoter {
  playerId: string;
  playerName: string;
  joined: boolean;
}

export interface DateCompletion {
  voted: number;
  total: number;
  nonVoters: NonVoter[];
}

export interface OwnTeamVoteCell {
  playerId: string;
  playerName: string;
  vote: Vote['type'] | null;
}

export interface OwnTeamDateResults {
  dateId: string;
  votes: OwnTeamVoteCell[];
  voted: number;
  total: number;
  nonVoters: NonVoter[];
}
