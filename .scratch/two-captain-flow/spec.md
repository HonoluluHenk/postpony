# Two-Captain Postponement Flow

Status: ready-for-agent

## Problem Statement

Today a Postponement is run by a single Organizer who manages both teams: they propose dates, toggle the `votable` switch, and confirm the final date, while every player — home and away — votes through one shared invitation password. Real postponements are negotiated between two captains, one per team. The opposing captain needs their own scoped control (adjust their roster, veto dates their side can't play, and mark the dates they'd accept), and the organizer needs that narrowing before they confirm. A single all-powerful organizer password can't express "scoped to the away team", and a single shared invitation password can't distinguish the opponent captain's edit rights from a player's vote.

## Solution

Introduce a second, implicit captain — the **Opponent Captain**, on the side opposite the organizer's `organizerTeam` — and split access into four per-postponement secrets (organizer captain, opponent captain, home player, away player). The opponent captain gets a scoped view where they can alter their own team's players, veto votable dates, and mark dates acceptable; the organizer confirms only among dates that are votable, acceptable, and not vetoed. The voting phases and the "opponent is ready" handshake stay out-of-app, and the status machine stays `Draft → Voting → Confirmed`.

## User Stories

1. As an organizer, I want to create a Postponement from a scraped Match, so that I can start the postponement negotiation.
2. As an organizer, I want the system to mint four secrets at creation — an organizer-captain password, an opponent-captain password, a home-player password, and an away-player password — so that every party gets its own scoped access.
3. As an organizer, I want to propose candidate dates, so that both teams have something to vote on.
4. As an organizer, I want to toggle the symmetric `votable` switch on a Proposed Date, so that I can add or remove dates from the poll for both teams.
5. As an organizer, I want to add and remove players on both teams, so that the rosters are complete and correct before voting.
6. As an organizer, I want to see both teams' vote tallies, so that I can judge whether each side is ready.
7. As an organizer, I want a share link carrying my own team's player password, so that my players can join and vote.
8. As an organizer, I want a share link carrying the opponent-captain password, so that I can hand the session to the opposing captain.
9. As an organizer, I want all three share links (my players, the opponent captain, the opponent players) visible on the edit page, so that I can distribute them to the right people.
10. As an organizer, I want my captain password to be required for edit access, so that merely knowing the session URL does not grant control.

11. As a home player, I want to join via the home-player link and vote on proposed dates, so that my availability is recorded.
12. As an away player, I want to join via the away-player link and vote on proposed dates, so that my availability is recorded.
13. As a player, I want to update my vote by re-voting, so that I can change my mind before confirmation.
14. As a player, I want only my team's player password to work for my team, so that the other team's link cannot grant me access.

15. As an opponent captain, I want to open the session via the opponent-captain link, so that I can review the organizer's proposal.
16. As an opponent captain, I want to add and remove players on my own team, so that my roster matches reality.
17. As an opponent captain, I want removing a player to also remove their votes, so that tallies stay consistent.
18. As an opponent captain, I want to veto a votable date, so that my team is not asked about a date we cannot consider.
19. As an opponent captain, I want to veto only votable dates, so that every veto is meaningful and no veto silently targets a date already out of the poll.
20. As an opponent captain, I want to un-veto a date, so that I can correct a mistake before confirmation.
21. As an opponent captain, I want to see my own team's vote tallies (and only mine), so that I can gauge my team's readiness without seeing the organizer's side.
22. As an opponent captain, I want to mark a date acceptable after my team has voted, so that I narrow the field to dates my side will actually accept.
23. As an opponent captain, I want to un-mark a date acceptable, so that I can correct a mistake before confirmation.
24. As an opponent captain, I want my access to be scoped — no proposing dates, no flipping the symmetric `votable` switch, no confirming — so that I cannot overstep into the organizer's role.

25. As an organizer, I want to confirm exactly one date, so that the postponed Match gets a new date.
26. As an organizer, I want to confirm only a date that is votable, acceptable, and not vetoed, so that I cannot lock in a date the opponent has rejected or vetoed.
27. As an organizer, I want to see which dates are acceptable and which are vetoed, so that I can pick a valid date to confirm.
28. As an organizer, I want confirming a non-acceptable or vetoed date to be a no-op, so that the invariant holds even if I attempt an invalid confirmation.

## Implementation Decisions

- **Four secrets replace the dual-password model** (ADR-0025). A `Postponement` carries four hashed secrets; the three shareable plaintexts — opponent-captain, home-player, away-player — are also persisted so their share links can be rendered. The organizer-captain password keeps its current behaviour: hashed, plaintext shown once at creation, not persisted.
- **Two implicit captains, no new entity.** The organizer sits on `organizerTeam`; the opponent captain is simply the side opposite `organizerTeam`, identified only by holding the opponent-captain password — mirroring how the organizer is identified today.
- **Three per-date flags.** `ProposedDate` gains two flags alongside the existing `votable`: `vetoed` (opponent-scoped, blocks confirmation, only settable on votable dates) and `acceptable` (opponent-set, constrains confirmation). `votable` keeps its existing symmetric semantics.
- **New domain operations** on `PostponementRules`, all pure `session → session`: `removePlayer` (cascade-deletes the player's votes), `setVetoed` (no-op on non-votable dates), `setAcceptable` (a symmetric toggle), and an opponent-scoped poll filter that hides vetoed dates from the opponent team's poll only.
- **Confirmation invariant.** `confirmDate` succeeds only when the date is `votable`, `acceptable`, and not `vetoed`; otherwise it is a no-op (unchanged session).
- **Creation mints and hashes at the trust boundary.** The create route generates and hashes all four passwords, passing the hashes and the three plaintexts into the domain `create` — keeping the domain free of crypto, as it is today.
- **Per-team join verification.** `/join/:id/:team` verifies the `?token=` against the matching team's player password (home path → home-player password, away path → away-player password); a team/token mismatch is a 403.
- **Opponent-captain route.** A new scoped edit surface, gated by the opponent-captain password, offering only: own-team player management, own-team tallies, and the `vetoed`/`acceptable` controls. It has no propose, symmetric-`votable`, or confirm affordances.
- **Edit authorization is enforced.** The organizer-captain password is verified on edit commands, closing the existing gap where the session URL alone granted edit access. Transport stays as the current query parameter (no cookie migration in this spec).
- **Status machine unchanged** (`Draft → Voting → Confirmed`); the sequenced voting phases and the "opponent is ready" handshake remain out-of-app conventions with no in-app gating.
- **Reopen preserves the new flags.** A soft reopen returns to `Voting` and keeps `vetoed`/`acceptable` and votes intact, exactly as it preserves `votable` and `confirmedProposedDateId` today.

## Testing Decisions

- **Test external behaviour, not implementation.** Assert on the resulting `Postponement` state and on what the user/screenreader sees — never on intermediate implementation steps.
- **Domain logic is unit-tested at the `PostponementRules` seam**, the highest seam in the codebase: every new operation gets a spec alongside the existing `postponement.spec.ts`, using `FakePostponementRules` to fix `newId`/`now`. Cover: remove-player vote cascade; set-vetoed only-on-votable; set-acceptable toggle; confirm-date success only for votable+acceptable+non-vetoed, and no-op otherwise; opponent-scoped poll hides vetoed dates only for the away team; create carrying four hashes and three plaintexts.
- **Password verification is tested at the trust boundary.** Join per-team token verification follows `join-handlers.spec.ts`; opponent-captain and organizer-captain guards follow `edit-handlers.spec.ts`; `crypto-utils` already has its own spec for hash/compare.
- **Happy path and likely error paths are covered in e2e** via the existing Page Objects (`EditPage`, `JoinPage`, plus a new opponent-captain page). Prior art: `join-voting.e2e.ts`, `postponement-editing.e2e.ts`, `invitation-link.e2e.ts`, `postponement-creation.e2e.ts`. Cover: a player joining with the wrong team's password is refused; the opponent captain alters players, vetoes, and marks acceptable; the organizer confirms only a valid date; an invalid confirm is a no-op.
- **Accessibility checks** (`checkA11y`) run on the new opponent-captain surface, matching the existing e2e a11y conventions.

## Out of Scope

- In-app gating of the voting phases or the "opponent is ready" handshake — these remain out-of-app conventions.
- Cookie-based session/password transport or any migration off the query-param capability.
- A named opponent-captain entity or any account/recovery mechanism.
- Per-player (rather than per-team) passwords.
- iCal-feed treatment of `vetoed`/`acceptable` dates beyond the existing votable-based listing.
- Any change to the click-tt scrape/creation wizard beyond minting the four secrets.

## Further Notes

- This spec implements ADR-0025 and amends ADR-0002 and ADR-0013; the glossary (`CONTEXT.md`) already reflects the new terms (Opponent Captain, Captain Password, Player Password, Vetoed, Acceptable).
- The pre-existing edit-authorization gap is folded into this spec because the two-captain model depends on captain-password verification being real, not cosmetic.
- `AvailabilityRecord` is unrelated dead code tracked separately under `.scratch/dead-code/`.
