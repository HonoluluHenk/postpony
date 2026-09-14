# 6. Runtime View

## 6.1 Create a postponement (scrape wizard)

```mermaid
sequenceDiagram
    participant O as Organizer (browser)
    participant H as Hono handler
    participant S as click-tt scraper
    participant DB as SessionStore
    O ->> H: GET /create/scrape
    H ->> S: fetchLeagues()
    S -->> H: leagues
    H -->> O: ScrapeLeaguesPage
    Note over O, H: groups → teams → matches (same drill-down)
    O ->> H: POST /create/scrape/match
    H ->> H: validate MatchSchema
    H ->> S: fetchPlayers(opponent) + fetchClubId + fetchVenues
    H ->> H: generate and hash two passwords, then rules.create()
    H ->> DB: store.save(session)
    H -->> O: HX-Redirect → /edit/:id?organizerPassword=…
```

Four GETs drill league → group → team → match. The final POST captures both teams' click-tt identities (ADR-0022), generates and hashes both passwords, creates a `Draft` postponement, saves it, and redirects to the edit view (the plaintext organizer password is shown once).

## 6.2 Edit mutations — single pipeline

All seven edit POSTs (`players`, `proposed-dates`, `proposed-date-visibility`, `proposed-date-confirm`, `proposed-date-delete`, `refresh-clashes`, `reopen`) flow through `runEditCommand(app, command)`:

```mermaid
sequenceDiagram
    participant B as Browser (HTMX)
    participant H as runEditCommand
    participant R as PostponementRules
    participant DB as SessionStore
    B ->> H: POST /edit/:id/…
    H ->> H: requireParam('id'), then store.get(id) → 404 guard
    H ->> R: command.apply(rules, session)
    R -->> H: new session
    H ->> DB: save only if identity changed
    alt partial / alwaysRender
        H -->> B: renderEditPartials (full-page fragment + OOB error/status)
    else
        H -->> B: redirect to /edit/:id?organizerPassword=…
    end
```

Proposing dates branches on `generate === 'tuple'` (single date vs generator). Both paths end in `withClashCheck`, which scrapes both teams' schedules and the home club's meetings, computes clashes + venue occupancy, and auto-deselects newly-added clashing dates (ADR-0023). A failed scrape degrades silently: dates are saved clash-free.

## 6.3 Join and vote

```mermaid
sequenceDiagram
    participant P as Player (browser)
    participant H as join handlers
    participant DB as SessionStore
    P ->> H: GET /join/:id/:team?token=…
    H ->> H: requireTeam (400) → requireSessionAndToken (403 on bad token)
    H ->> DB: store.get(id)
    alt Confirmed
        H -->> P: ConfirmedInfo
    else
        H -->> P: JoinPage (roster + pending votes)
    end
    P ->> H: POST /join/:id/:team/register
    H ->> H: rules.registerParticipant
    H -->> P: redirect to /vote?playerId=…&token=…&(pending)
    P ->> H: POST /join/:id/:team/vote
    H ->> H: rules.applyVotes (drops non-votable / non-whitelisted)
    H ->> DB: save if changed
    H -->> P: VotePage (tally + own votes)
```

A documented deliberate **state-changing GET** (`GET /join/:id/:team/vote`) applies votes read from `?vote-<dateId>` query params, so one-click calendar vote links work (`join-vote-get.ts`). Player identity is stored in `localStorage` key `postpony-player-<sessionId>-<team>`.

## 6.4 iCal export

`GET /edit/:id/calendar.ics` (no password) and `GET /join/:id/:team/calendar.ics` (token-gated) both build an RFC 5545 calendar — one `VEVENT` per votable date, `STATUS:CONFIRMED` only when locked, `TZID=Europe/Zurich`, plus per-date one-click vote links in `X-ALT-DESC`.

## 6.5 Locale resolution (every request)

`languageMiddleware` runs for `*`: `?lang=<locale>` sets a 365-day cookie and redirects with `lang` stripped; otherwise cookie → `Accept-Language` (q-sorted, prefix-mapped) → default `de-CH`.

## 6.6 Error path

Any thrown error reaches the central `onError` in `src/build-app.tsx`: `ClickTTError` → 400 + translated message; `AppError`/`HTTPException` → own status; anything else → 500. Partial requests render an out-of-band `<ErrorContainer>` swapped into `#error-container`; full requests render `<ErrorPage>`.
