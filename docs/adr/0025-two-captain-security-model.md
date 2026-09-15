# ADR 0025: Two-Captain Security Model — Four Secrets

## Status
Accepted. Amends ADR-0002 and ADR-0013.

## Context
ADR-0002 established a dual-password model: one organizer password for the initiating captain and one shared invitation password for all participants. The postponement flow now has a second actor — the opponent captain — who reviews the organizer's proposed dates, manages their own team's roster, vetoes dates, and marks dates acceptable before the organizer confirms. A single organizer password cannot express "scoped to the away team", and a single shared invitation password cannot distinguish the opponent captain's edit rights from a player's vote rights.

## Decision
Replace the dual-password model with four per-postponement secrets and two implicit captains:

- **`organizerCaptain` password** — full edit: propose dates, flip `votable`, add/remove players, confirm.
- **`opponentCaptain` password** — scoped to the opponent team (the side opposite `organizerTeam`): alter opponent players, set `vetoed`, mark `acceptable`. Repurposed from the former invitation password.
- **`home` and `away` player passwords** — per-team vote access, replacing the one shared invitation password.

The opponent captain is implicit (no entity), like the organizer. Each Proposed Date carries three flags: `votable` (organizer, symmetric), `vetoed` (opponent, opponent-poll-only, blocks confirmation), and `acceptable` (opponent, constrains confirmation). Confirmation is organizer-only and restricted to dates that are votable, acceptable, and not vetoed. Voting phases and the "opponent is ready" handshake stay out-of-app; the status machine is unchanged (`Draft → Voting → Confirmed`).

## Considered Options
- **Keep dual-password; give the opponent captain the organizer password**: rejected — no way to scope rights; the opponent captain could confirm or edit the home roster.
- **One shared invitation password for everyone**: rejected — cannot distinguish captain edit from player vote.
- **One secret per player**: rejected — overkill; player identity is already per-postponement in localStorage (ADR-0013).

## Consequences
- Two captains, each with a scoped hashed secret; players hold per-team secrets.
- ADR-0002's "invitation password" and ADR-0013's "shared token" are superseded; join links now carry a team-matching player password.
- Removing a player now cascade-deletes their votes (a new remove-player operation; previously only add-player existed).
