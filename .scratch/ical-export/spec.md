# Export votable Proposed Dates as an iCal file

**Status:** ready-for-agent

## Problem Statement

Organizers and participants can only see a Postponement's candidate reschedule dates inside the app. To check them against their own calendars — personal commitments, hall bookings, work — they have to re-type or remember each date. The confirmed date, once locked, is equally trapped inside the app.

## Solution

On the proposed dates list (organizer edit page) and on the join/vote pages there is a link that downloads a calendar (`.ics`) file. The file contains one event per **currently votable Proposed Date** (`rules.votableDates`), in ascending order. Once the organizer locks a date, that date's event is marked `STATUS:CONFIRMED`; the rest stay `STATUS:TENTATIVE`. Both pages export the identical file. When there are no votable dates the link is hidden.

A downloaded event shows the match (`Verschiebung: <match>`, with teams), the candidate date/time as local `Europe/Zurich` wall-clock, a two-hour end time, and the venue name and address. The description carries the original Match date and a link back to the Postponement.

## User Stories

1. As an organizer, I want to download a calendar file containing all votable Proposed Dates from the edit page, so that I can compare the candidate slots against my own calendar.
2. As a participant, I want to download the same calendar file from the vote page, so that I can check the candidate slots against my availability before voting.
3. As a participant, I want the download to work with only my invitation token, so that I do not have to register a Player first.
4. As an organizer, I want each event titled `Verschiebung: <match name> (home vs guest)`, so that I can spot it in a busy calendar.
5. As a user, I want each event to show the venue name and address, so that I know where the rescheduled Match would be played.
6. As a user, I want event times encoded as local `Europe/Zurich` wall-clock, so that the times match the kickoff times I was given.
7. As a user, I want each event to end two hours after it starts, so that my calendar renders a sensible time block rather than a zero-length dot.
8. As a user, I want the locked date's event marked `CONFIRMED` and the remaining candidates marked `TENTATIVE`, so that I can tell at a glance which slot is final.
9. As a user, I want the event description to include the original Match date and a link back to the Postponement, so that I have context from my calendar alone.
10. As an organizer, I want the export link hidden while there are no votable Proposed Dates, so that I never download an empty calendar.
11. As a user, I want a stable identifier per Proposed Date across downloads, so that re-importing the file does not create duplicate calendar entries.
12. As a maintainer, I want the calendar serialization covered by unit tests, so that the `.ics` contract (fields, ordering, escaping, line endings) is pinned.
13. As a maintainer, I want the export routes covered by handler tests for headers and guards, so that the wiring and access rules stay correct.
14. As a maintainer, I want an end-to-end happy-path download from both pages, so that the full flow (link → click → file) is verified in CI.

## Implementation Decisions

**Pure builder module.** A new module in `src/lib/` (e.g. `ical.ts`) exposes a pure function `buildIcal(session, {baseUrl, locale})` returning the `text/calendar` string. Handlers load the session, run the guard, call the builder, and return the body — no serialization logic lives in the routes.

**Event set.** One `VEVENT` per `rules.votableDates(session)` (ascending by start, then id). Non-votable dates are never exported. A date whose id equals `confirmedProposedDateId` is `STATUS:CONFIRMED`; all others are `STATUS:TENTATIVE`. After a reopen the formerly-confirmed date is simply `TENTATIVE` again — it is votable once more.

**Event fields.**

- `SUMMARY`: `Verschiebung: ` + Match name + the two team names.
- `DTSTART;TZID=Europe/Zurich`: the Proposed Date's `dateTimeRange.start` wall-clock (`YYYYMMDDTHHmmss`), matching how the app stores and displays times everywhere.
- `DTEND;TZID=Europe/Zurich`: `start` + `CLASH_BUFFER_HOURS` (reuse the constant in `src/lib/clashes.ts`, currently `2`). Ponytail comment: the buffer is the app's 2-hour adjacency convention, not a real Match duration — the domain models a single instant, so a duration is synthesized at export.
- `LOCATION`: the Venue referenced by `venueNumber` (1-based; absent means venue 1): name, address, postal code, city.
- `DESCRIPTION`: the original Match date (`originalMatchDateTime`) formatted for the locale, plus the Postponement URL built from `baseUrl`.
- `UID`: host-independent and stable per date — `<proposedDateId>@postpony` — so re-imports on different hosts do not churn entries.
- `DTSTAMP`: current time at build (the builder's `now` seam if it needs determinism in tests).
- `STATUS` per the event set rule.

**Serialization.** RFC 5545 `VCALENDAR` with `VERSION:2.0`, `PRODID`, `CALSCALE:GREGORIAN`, `METHOD:PUBLISH`, `X-WR-CALNAME` = Match name. `CRLF` line endings; text values escaped (`,` `;` `\` `\n`); lines folded at 75 octets (RFC 5545 requirement). A small fold/escape helper lives in the same module.

**Routes.** Two read-only GET routes returning `text/calendar; charset=utf-8` with `Content-Disposition: attachment; filename="<match>.ics"` (filename sanitized for unsafe characters):

- `GET /edit/:id/calendar.ics` — no password required; the edit page is already publicly readable.
- `GET /join/:id/:team/calendar.ics` — token only, reusing `requireSessionAndToken`; **no `playerId` required** (a calendar file is not sensitive and invite links are already shared widely). Bad token → 403, unknown session → 404.

**Link placement.** A "Export as calendar (.ics)" link in the Proposed Dates section on the edit page, and on the join vote page at both steps (Voting poll and Confirmed info). Hidden when `votableDates()` is empty. Per the partial-vs-initial rule, the link must exist in the initial render; HTMX partials keep it present.

**Localization.** One new translation key for the link label, kept in sync across `en.json`/`de.json` (fr-CH/it-CH reuse English per ADR-0016).

## Testing Decisions

A good test asserts the exported calendar's *external contract* — header fields, which dates appear and in what order, and the status/venue/time values a calendar app would consume — not the internals of the serializer.

**Primary seam — `src/lib/ical.spec.ts`** (node Vitest, prior art: `clashes.spec.ts`, `venue-occupancy.spec.ts`). Using the existing fixture builders (`aSession`, `aProposedDate`), assert:

- one VEVENT per votable date in ascending order; non-votable dates excluded;
- `STATUS:CONFIRMED` on the locked date, `TENTATIVE` elsewhere;
- `DTSTART`/`DTEND` values with `TZID=Europe/Zurich` and `DTEND − DTSTART = CLASH_BUFFER_HOURS`;
- `LOCATION` resolves via `venueNumber` and falls back to venue 1 when absent;
- `SUMMARY`/`DESCRIPTION` text, original date and link present;
- UID identical across two builds of the same session;
- `CRLF` line endings and correct escaping of special characters in names/addresses.

**Handler seam** (prior art: `join-handlers.spec.ts`, `edit-handlers.spec.ts`). Assert `200`, `text/calendar`, and `Content-Disposition: attachment` on both routes; the join route works with token only (no `playerId`) and returns `403` on a bad token; unknown session returns `404`.

**E2E** (prior art: existing Playwright flow specs). One happy path: from the edit page and from the join vote page, click the export link and assert the download is `<match>.ics` with `text/calendar` and at least one `VEVENT`; assert the link is absent on a Draft Postponement with no Proposed Dates.

## Out of Scope

- A real duration on Proposed Date (`dateTimeRange.end` stays equal to `start`); the exported duration is synthesized only.
- Exporting non-votable or closed Proposed Dates.
- All-day events, recurring events, alarms, reminders, attendees, or multiple calendars in one file.
- Configurable timezone (fixed `Europe/Zurich`).
- iCal import or two-way sync.
- Any change to the vote or edit flows themselves.

## Further Notes

- Both pages export the identical file, so the data is consistent no matter where it is downloaded from.
- `CLASH_BUFFER_HOURS` doubles as the exported event duration — a deliberate reuse of the app's 2-hour convention, not a claim about real Match length (ponytail comment).
- Reopen history: the formerly-confirmed date reappears as `TENTATIVE`, which is correct — it is votable again.
