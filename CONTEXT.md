# Context

Domain glossary for PostPony — one shared vocabulary for humans and agents. See also the Architecture Decision Records in `docs/adr/`.

## Postponement

The primary entity: one postponed match, from draft to a confirmed new date. Persisted as a `Postponement` (`src/lib/models.ts`); its rules live in the `PostponementRules` module (`src/lib/postponement.ts`). _Avoid_: Reschedule, session, reschedule

- **State** is a plain, serializable `Postponement`, so it fits the session store unchanged — MemorySessionStore for tests, SqliteSessionStore (`@libsql/client`) for development and production (Turso for production).
- **Voting model** — `organizerTeam` (`'home' | 'away'`, the side the organizer manages), `reopenCount` (number of soft reopens, starts `0`), and `confirmedProposedDateId` (the locked date, kept as history when reopened).
- **Contract** — operations are pure methods that take a session and return a new session; handlers write the returned session back to the store.
- **Operations** (pure `session → session` methods on `PostponementRules`):
    - `create` — build a new Draft Postponement from scraped Match data, empty dates/votes, `reopenCount` 0.
    - `registerParticipant` — join or match a participant on a team.
    - `addPlayer` — add a roster Player from the edit view.
    - `proposeDate` — add a Proposed Date.
    - `castVote` — record or update a Vote, one per participant per date.
    - `applyVotes` — apply a batch of submissions, dropping non-votable dates and non-whitelisted values.
    - `tally` / `splitTallies` — aggregate Votes per Proposed Date, optionally per team.
    - `votableDates` — list the Proposed Dates that are votable.
    - `setVotable` — toggle whether either team may vote on a Proposed Date (formerly `setVotableByOpponent`, now symmetric for home and away).
    - `confirmDate` — lock a Proposed Date as final: sets `confirmedProposedDateId` and moves to `Confirmed`; a no-op for dates that are not `votable`, not `accepted`, or not `opponentVotable`.
        - `reopen` — soft-reopen a Confirmed session back to `Voting`; `reopenCount` + 1, history/votes/flags preserved.
        - `deleteProposedDate` — delete a Proposed Date; cascade-deletes its Votes and clears a dangling `confirmedProposedDateId` if that date was the confirmed-history date. A no-op for an unknown date id; status is left untouched.
        - `removePlayer` — remove a roster Player; cascade-deletes their Votes.
    - `setOpponentVotable` — toggle a Proposed Date's `opponentVotable` flag (only on votable dates).
    - `setAccepted` — toggle a Proposed Date's `accepted` flag.
        - `teamCompletion` — whether a team has voted on all votable dates.
        - `ownTeamResults` — the organizer's own team's votes, for the edit view.
- **Seam** — non-determinism sits behind two overridable methods, `newId` and `now` (an id generator and a clock): real defaults in production, overridden by a `FakePostponementRules` subclass in tests. The class is the test surface.

## Match

The scheduled fixture being postponed. A Postponement postpones exactly one Match; its original start is stored as `originalMatchDateTime`, and its two sides as typed `homeTeam` and `guestTeam` fields. Scraped from click-tt.ch at creation and bound permanently: a Match is never editable afterwards — a Postponement cannot be re-pointed at a different fixture (ADR-0017 superseded by the scrape-only decision). click-tt calls it a "meeting", wording that survives only in the outbound click-tt URLs. _Avoid_: Meeting, fixture, game

## click-tt Team Identity

The three-part click-tt address of a team — `championship`, `group`, `teamtable` — scraped and persisted per team at creation (ADR-0022). It lets the scraper re-fetch that team's schedule for clash checks later. _Avoid_: team link, league reference

## Fixture Mode

An offline mode where the scraper reads local HTML files instead of the click-tt.ch network, activated by `APP_CLICK_TT_FIXTURES_DIR`. Used by e2e tests so they run deterministically without network. _Avoid_: mock mode

## Scrape Failure

A transient failure to fetch or parse click-tt.ch data during scraping or a schedule check: either click-tt reports an error (an upstream HTTP failure, e.g. 503) or the host is unreachable (a transport failure). Retryable and shown to the organizer inline on the wizard step with a retry control, instead of a generic error page. Non-transient failures (internal errors, missing parameters) stay silently logged. _Avoid_: scrape error, fetch error

## Organizer

One of the two captains: the person who creates and manages a Postponement, sitting on `organizerTeam` (`'home' | 'away'`). Holds full edit rights through the **organizerCaptain** password (no account, no recovery): proposes dates, flips the `votable` switch, adds/removes players, confirms and reopens. The organizer may also join their own team as a Participant via that team's player-password link. Identity is implicit — nothing names the organizer beyond `organizerTeam` and the password. _Avoid_: owner, admin, home captain (ambiguous — the organizer may sit on the away side)

## Opponent Captain

The captain of the side opposite the organizer (the team that is not `organizerTeam`). Identity is implicit, like the organizer's. Holds the **opponentCaptain** password and gets scoped edit rights over their own team only: alter opponent Players, turn a Proposed Date's `opponentVotable` off, and mark it `accepted`, and shares their own team's player invitation link from the opponent page. Cannot propose dates, flip the symmetric `votable` switch, or confirm. Sees only their own team's Clash lines on each votable Proposed Date — never the organizer team's — with a "No other games" chip when their side is checked and clean, and may trigger a schedule re-check from the opponent page that refreshes only their own side's lines (plus Venue Occupancy when sitting on the home side). _Avoid_: away captain, guest captain, co-organizer

## Captain Password

One of the two captain-facing secrets: **organizerCaptain** (full edit) or **opponentCaptain** (scoped to the opponent team). Generated at creation; stored hashed, with the opponentCaptain plaintext also persisted so its share link can be rendered. _Avoid_: organizer password, admin token

## Player Password

A per-team secret — **home** or **away** — that grants vote access to that team's Players, carried in the join link as `?token=`. Replaces the single shared invitation password (ADR-0013): each team now has its own, so a captain invites only their own players. Generated at creation; stored hashed, with the plaintext persisted for share links. _Avoid_: invitation password, invite token, join code, reschedule token

## Club

The tenant a Postponement belongs to. Every Postponement carries a `clubId`, defaulting to `DEFAULT_CLUB_ID`. Multi-tenancy was planned (ADR-0001) but withdrawn — the system is single-club; `club_id` is retained as a forward-compatible column. _Avoid_: tenant, organisation

## Player

A raw player from the roster, scraped from click-tt.ch or added by a captain: `{id, name, teamId}` with `teamId` `'home' | 'away'`. No login; identity is per-postponement, held client-side in `localStorage` (see ADR-0013). _Avoid_: member, user

## Participant

A Player taking part in a Postponement — joined via their team's player-password link and able to Vote. Every Vote and availability record references a Participant (`participantId`). A device holds at most one Participant identity per team; **Switch Participant** drops that identity so a different roster Player can join from the same device. Votes already cast stay with the outgoing Participant. _Avoid_: player (when meaning "has joined"), attendee, log out (there is no login — switching only drops the device-local identity)

## Match Format

How many players a side must field for a Match: `maxPlayers` (full strength) and `minPlayers` (the smallest side that can still play, at reduced strength), under a profile `name`. Persisted per Postponement; every new Postponement gets the default profile. Drives the availability grouping of Proposed Dates only — it gates nothing. _Avoid_: match config, team size, lineup

## Proposed Date

A candidate new date/time for the postponed Match, proposed by the organizer. Carries three flags: `votable` (organizer, symmetric — whether either team may vote; new dates are votable by default, non-votable dates are hidden from both polls and cannot be confirmed), `opponentVotable` (opponent, see Opponent Votable), and `accepted` (opponent, see Accepted).

## Opponent Votable

A per-Proposed-Date switch (`opponentVotable`, on by default) held by the Opponent Captain: whether their own team may vote on that date. Turning it off removes the date from the opponent team's poll only — the organizer's symmetric `votable` switch is untouched — and it blocks confirmation. Only meaningful on a votable date. Displayed as "Votable", the same word as the organizer's switch but a distinct flag. _Avoid_: veto, vetoed, block, disabled

## Accepted

A Proposed Date flag (`accepted`) set by the Opponent Captain after their team has voted, marking the dates the opponent side will accept as the postponed Match's new date. Confirmation is restricted to accepted dates. _Avoid_: acceptable, eligible, shortlisted, suitable

## Clash

A scheduled Match of the home or the guest team whose start falls within a Proposed Date's `dateTimeRange` plus a two-hour buffer on either side — the hall may be booked or the team double-booked. Computed from both teams' scraped click-tt schedules by checking when dates are proposed and again on a manual refresh; the postponed Match itself is excluded — the game being rescheduled is not a Clash. Each Clash is attributed to the affected team (home or away) and carries the opponent's name and the game's start. A newly proposed date that has a Clash is auto-deselected (its `votable` flag set to `false`), a default the organizer can reverse with the votable switch. A match without team identities has no clash data. A schedule check that fails transiently never blocks saving: the Proposed Dates are kept without fresh clash data and the Postponement carries `clashDataStale` until the next successful check. Each captain sees only their own side's lines: the edit page shows both teams'
lines, the opponent page only the opponent team's, and the vote page none. _Avoid_: conflict, collision, double booking

## Venue

A hall of the home club where a rescheduled Match can be played. Carries a 1-based `venueNumber` and a name/address. The home club's venues are snapshotted on the Postponement at creation and locked thereafter; a Proposed Date may reference one by number. _Avoid_: hall, Spiellokal, location

## Venue Occupancy

The number of the home club's home Matches scheduled at a Venue whose start falls within a Proposed Date's `dateTimeRange` plus a two-hour buffer on either side — the hall may be busy at that time. Computed from the home club's scraped schedule (all teams, home matches only) when clashes are checked and again on a manual refresh; the postponed Match itself is excluded. Informational only: unlike a Clash, it never auto-deselects a Proposed Date. Matches without a venue number are not counted. _Avoid_: venue clash, hall conflict, double booking

## Vote

A Participant's `Yes` / `No` / `IfNecessary` on one Proposed Date. At most one Vote per Participant per Proposed Date; re-voting updates the existing Vote. `IfNecessary` reads "I'll make it work if needed" (displayed as "if necessary" / "notfalls") — distinct from an undecided abstention.

## Proposed Dates Generator

The edit-page interaction for proposing a weekly slate of candidate times in one step. It renders a fixed Monday–Sunday grid; for each day the organizer either enters a time (which produces a Proposed Date inside the planning window, anchored on the Match's `originalMatchDateTime`) or leaves the row empty (which is skipped). The weekdays are locked and cannot be added, removed, or re-labelled. _Avoid_: add-row/remove-row generator, free-form slate

## Planning Window

The range within which the Proposed Dates Generator can place dates: the Match's `originalMatchDateTime` plus a fixed forward horizon (4 weeks, `MAX_FORWARD_WEEKS_FROM_ORIGINAL`). _Avoid_: suggestion horizon

## iCal Export

The RFC 5545 calendar feed of a Postponement's votable Proposed Dates, with per-date one-click vote links. Exposed at the edit and join endpoints. _Avoid_: calendar download, .ics feed

## Locale

The user-facing language/region, one of `de-CH | fr-CH | it-CH | en-US` (default `de-CH`), resolved per request from `?lang=` → cookie → `Accept-Language`. Drives translations, date/time input grammar, and formatting; fr-CH/it-CH reuse English text (ADR-0016). _Avoid_: language setting, i18n config

## Status

The lifecycle of a Postponement: `Draft → Voting → Confirmed`. `Draft` at creation, `Voting` from the first proposed-date add and again on reopen, `Confirmed` when the organizer locks a date. Reopen returns to `Voting` and increments `reopenCount`.
