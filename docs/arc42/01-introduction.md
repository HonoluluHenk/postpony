# 1. Introduction and Goals

## 1.1 Requirements Overview

PostPony lets a table-tennis club postpone a scheduled match to a new date. It scrapes the real fixture and roster from click-tt.ch, lets an organizer propose candidate dates, and lets the invited players vote on them until the organizer confirms one.

The following capabilities describe the system **as built** (each is traceable to a route and an e2e spec, see §5 and §6):

1. **Create a postponement** by walking a click-tt scrape wizard (league → group → team → match); the Match, both teams' click-tt identities, the rosters and the home club's venues are scraped and bound permanently. (`/create/scrape/*`, ADR-0024)
2. **Manage the roster** — add players to the home or away team. (`POST /edit/:id/players`)
3. **Propose dates** one at a time, or as a weekly slate through the fixed Monday–Sunday generator. (`POST /edit/:id/proposed-dates`, ADR-0021)
4. **Detect clashes** — flag dates that collide with either team's click-tt schedule (±2 h) and the home venue's occupancy; newly-proposed clashing dates are auto-deselected. (ADR-0023)
5. **Toggle votability** per proposed date. (`POST /edit/:id/proposed-date-visibility`)
6. **Invite players** via a shareable, token-gated link per team. (`/join/:id/:team?token=`, ADR-0013)
7. **Vote** `Yes` / `No` / `IfNecessary`, one vote per participant per date. (`/join/:id/:team/vote`)
8. **Confirm** a date, locking the postponement to `Confirmed`. (`POST /edit/:id/proposed-date-confirm`)
9. **Reopen** a confirmed postponement back to `Voting`, preserving history and incrementing `reopenCount`. (`POST /edit/:id/reopen`)
10. **Export** the candidate dates as an iCal feed with per-date one-click vote links. (`/edit/:id/calendar.ics`, `/join/:id/:team/calendar.ics`)

### 1.1.1 Explicitly not built

These appeared in earlier planning documents and were dropped (see §11 and the superseded/withdrawn ADRs). They are **non-goals**, not backlog:

- Club Manager role, club registration and onboarding tokens.
- Venue CRUD with operating hours, blackout dates, or maximum-overlap limits.
- Player availability entry (the `AvailabilityRecord` type is dead code).
- Participant-side date proposals (only the organizer proposes).
- Two-step opponent-confirmation approval workflow (single-step confirm by organizer).
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
| Player / Participant | joins via invitation link and votes                                          |
| click-tt.ch          | upstream source of fixtures, rosters, venues, schedules (scraped)            |
| Operator             | deploys to Cloudflare Workers + Turso; runs local dev with self-signed certs |
