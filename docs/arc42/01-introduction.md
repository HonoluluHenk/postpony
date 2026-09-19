# 1. Introduction and Goals

## 1.1 Requirements Overview

PostPony lets a table-tennis club postpone a scheduled match to a new date. It scrapes the real fixture and roster from click-tt.ch, lets an organizer propose candidate dates, and lets the invited players vote on them until the organizer confirms one.

The following capabilities describe the system **as built** (each is traceable to a route and an e2e spec, see §5 and §6):

1. **Create a postponement** by walking a click-tt scrape wizard (league → group → team → match); the Match, both teams' click-tt identities, the rosters and the home club's venues are scraped and bound permanently. (`/create/scrape/*`, ADR-0024)
2. **Manage the roster** — add players to the home or away team. (`POST /edit/:id/players`)
3. **Propose dates** one at a time, or as a weekly slate through the fixed Monday–Sunday generator; the generator remembers the organizer team's last slate (weekday times + venue) per device and prefills it on the next visit, locale-independently. (`POST /edit/:id/proposed-dates`, ADR-0021)
4. **Rank proposed dates by availability** — the edit and opponent date rails group by the viewing team's own votes under the Postponement's Match Format: Full strength / With if-necessary / Reduced strength / Not playable, with dates closed to that team shown as Not playable. (`?sort=availability`, ADR-0027)
4. **Detect clashes** — flag dates that collide with either team's click-tt schedule (±2 h) and the home venue's occupancy; newly-proposed clashing dates are auto-deselected. (ADR-0023)
5. **Re-check clashes on demand** — the organizer refreshes both sides from the edit page; the opponent captain refreshes only their own side from the opponent page (plus Venue Occupancy when on the home side), never touching the other side's lines or the votable switch. (`POST /edit/:id/refresh-clashes`, `POST /opponent/:id/refresh-clashes`, ADR-0026)
5. **Toggle votability** per proposed date. (`POST /edit/:id/proposed-date-visibility`)
6. **Invite players** via a shareable, per-team token link — each team has its own player password. The organizer shares his own team's link from the edit page; the opponent captain shares their team's link from the opponent page. (`/join/:id/:team?token=`, ADR-0013, ADR-0025)
7. **Vote** `Yes` / `No` / `IfNecessary`, one vote per participant per date, with the dates grouped by ISO week, a sticky Set-all action bar, and a scriptless (no-JS) submit fallback. (`/join/:id/:team/vote`)
8. **Confirm** a date, locking the postponement to `Confirmed` — only a date that is votable, still in the opponent's poll (opponent-votable), and accepted by the opponent captain. (`POST /edit/:id/proposed-date-confirm`)
9. **Reopen** a confirmed postponement back to `Voting`, preserving history and incrementing `reopenCount`. (`POST /edit/:id/reopen`)
10. **Export** the candidate dates as an iCal feed with per-date one-click vote links. (`/edit/:id/calendar.ics`, `/join/:id/:team/calendar.ics`)
11. **Opponent-captain scoped view** — the opposing captain manages their own team's roster, shares their team's player invitation link, turns a date's Votable off (which also takes it out of their own team's poll), and marks dates accepted, seeing only their own team's tallies and clash lines (with a clean chip on checked-clean dates), and re-checks their own side's schedule on demand. (`/opponent/:id`, ADR-0025, ADR-0026)
12. **Restrict crawling and indexing to the start page** — `robots.txt` and `ai.txt` express the policy, a request filter 403s known bot/AI user-agents off every non-start route, and non-start pages carry `X-Robots-Tag: noindex`. (`/robots.txt`, `/ai.txt`, §8.10)

### 1.1.1 Explicitly not built

These appeared in earlier planning documents and were dropped (see §11 and the superseded/withdrawn ADRs). They are **non-goals**, not backlog:

- Club Manager role, club registration and onboarding tokens.
- Venue CRUD with operating hours, blackout dates, or maximum-overlap limits.
- Player availability entry.
- Participant-side date proposals (only the organizer proposes).
- In-app gating of the voting phases or an "opponent is ready" handshake (the opponent captain accepts dates in-app, but sequencing stays out-of-app).
- WhatsApp / Email message template generation (only raw-link clipboard copy).
- Multi-tenancy (single club; `club_id` is retained as a forward-compatible column).

## 1.2 Quality Goals

The quality goals are derived from the code and ADRs, not from a separately-negotiated SLO. See §10 for the full tree and for what is *not* specified.

| Goal                        | Motivation                                     | Evidence                                                  |
|-----------------------------|------------------------------------------------|-----------------------------------------------------------|
| Accessibility (WCAG 2.2 AA) | top-level product requirement                  | ADR-0004; axe enforced in e2e (`e2e-tests/fixtures.ts`)   |
| Testability                 | domain logic must be unit-testable without I/O | `newId`/`now` seam, `FakePostponementRules`               |
| Worker/Node portability     | one codebase, two runtimes                     | `worker.ts` + `src/index.ts`, non-literal dynamic imports |
| Deterministic e2e           | offline, reproducible integration tests        | fixture mode (`APP_CLICK_TT_FIXTURES_DIR`)                |

## 1.3 Stakeholders

| Role                 | Interest                                                                     |
|----------------------|------------------------------------------------------------------------------|
| Organizer            | creates and manages one postponement; proposes, confirms, reopens            |
| Opponent Captain     | manages the opposing team's roster; toggles dates' Votable, accepts dates    |
| Player / Participant | joins via their team's player-password link and votes                        |
| click-tt.ch          | upstream source of fixtures, rosters, venues, schedules (scraped)            |
| Operator             | deploys to Cloudflare Workers + Turso; runs local dev with self-signed certs |
