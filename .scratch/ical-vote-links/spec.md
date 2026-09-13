# One-click vote links in the iCal export

**Status:** ready-for-agent

## Problem Statement

Participants download the calendar file to check a Postponement's Proposed Dates against their own schedule — but after checking, they must switch back to the app, identify themselves, and cast a Vote per date manually. The candidate date is right there in their calendar, yet the vote cannot happen from it. Every date requires re-typing or navigation back and forth.

## Solution

Each VEVENT in the calendar file carries, for its one Proposed Date, a set of three one-click Vote links — `Yes`, `IfNecessary`, `No` — labelled in the export's locale. Clicking a link casts exactly that Vote for that date. The `URL:` property additionally points at the Postponement's voting page.

The join-page export can be *personalized*: the "Export as calendar" links on the voting poll and the confirmed-info page append the current Participant's identity, and the generated file embeds it into every link — so clicks cast immediately, on any device, with no who-are-you step. A stale or foreign identity degrades silently to an unpersonalized file whose links run the existing register step first, preserving the intended date and choice so the Vote lands on arrival.

Vote links exist only in the invitation-token-gated join export. The edit-page export (public, tokenless) is unchanged, as is its existing description link.

## User Stories

1. As a Participant, I want each Proposed Date's calendar entry to include a `Yes`, `IfNecessary`, and `No` link, so that I can cast my Vote from my calendar in one click.
2. As a Participant, I want clicking a vote link to cast that exact Vote for that date, so that I do not have to re-enter the app and the poll.
3. As a Participant, I want the calendar I download from the voting page to embed my identity, so that my one-click Votes cast immediately on any device.
4. As a Participant, I want a calendar file without my identity to still work, so that a forwarded or stale file degrades to the who-are-you step instead of failing.
5. As a Participant, I want the "who are you" step to remember which date and which choice I clicked, so that after identifying myself my Vote lands without re-selecting it.
6. As a Participant, I want to re-vote by clicking a different choice link, so that a change of heart updates my Vote silently.
7. As a Participant, I want clicking a vote link when the Postponement is already locked to show me the confirmed match, so that I do not silently vote on a dead date.
8. As a Participant, I want a calendar app's native "Open URL" button on an event to open the voting page, so that I can reach the poll even without the per-choice links.
9. As an Organizer, I want the edit-page export to keep working exactly as before, so that my tokenless calendar artifact does not carry voting capability.
10. As a maintainer, I want the choice links URL-escaped and line-folded per RFC 5545, so that calendar clients render them correctly.
11. As a maintainer, I want the choice-link labels localized with the export's locale, so that a German-exported calendar reads "Ja" / "Notfalls" / "Nein".
12. As a maintainer, I want one e2e flow that goes link → download → click an embedded vote link → poll reflects the Vote, so that the whole chain is proven in CI.

## Implementation Decisions

**Vote-link URL design.** One-click Vote links reuse the existing `GET /join/:id/:team/vote` route (the same action the poll form submits to). Each link is:

```
GET /join/:id/:team/vote?token=<invitationPassword>&playerId=<participantId>&vote-<proposedDateId>=Yes|IfNecessary|No
```

`token` and `playerId` are repeated on every link, matching how the vote page already carries them as query parameters. The choice value is the domain `Vote.type` (`Yes` | `IfNecessary` | `No`), URL-encoded. A GET performs a state change here; the vote is idempotent-update (`castVote` upserts), one click is the whole interaction, and the request is already token-gated — a deliberate, ponytail-commented trade-off for one-click mail links, not a generic GET-with-side-effects surface.

**GET `/vote` casting.** The existing GET handler is extended: when the query contains `vote-<id>` fields it validates each against `rules.votableDates`, casts via `rules.castVote`, saves, and continues to render as today. Silent re-vote (a second click with a different value overwrites). Pristine dates and already-voted dates behave identically. A `playerId` that identifies no Participant on the team is not a 400 — it triggers the existing redirect to the register step, now carrying the intent.

**Intent preservation through the register step.** When an unpersonalized link is clicked (`playerId` unknown), the GET handler redirects to `/join/:id/:team?token=…` and carries the pending `vote-<dateId>=<value>` through. The register POST's redirect back to the vote page appends the same pending field, so the GET vote handler casts it on arrival — one mechanism covers both the personalized and the fallback path.

**Builder signature.** `buildIcal(session, {baseUrl, locale, now?, playerId?})` in the pure ical module gains an optional `playerId`. When present, every generated URL embeds it; when absent, links omit it. The builder stays pure and I/O-free: the locale's translated choice labels are passed in as strings via `options` (e.g. `labels: {yes, no, ifNecessary, action}`), not fetched inside the builder.

**VEVENT content.**

- `URL:` — the voting page `GET /join/:id/:team/vote?token=…&playerId=…` (playerId only when personalized). Single-valued per RFC 5545, so it is always the choice-less poll link, satisfying the calendar apps' native "Open URL" button.
- `DESCRIPTION` — the existing original-Match line and Postponement link stay; a new line adds the three choice links, e.g. `Vote: Ja | Nein | Notfalls`, each link URL-escaped and line-folded like every other text value. Labels come from the existing `vote_yes` / `vote_no` / `vote_if_necessary` keys plus one new action label, threaded through `options.labels`, kept in sync across `en.json`/`de.json` (fr-CH/it-CH reuse English per ADR-0016).

**Join export route.** `GET /join/:id/:team/calendar.ics` accepts an optional `playerId` query param. If present and matching a Participant on that team, it is passed to the builder (personalization). If missing or not matching (stale personalized URL, calendar-bot re-fetch, foreign identity), the handler degrades silently to an unpersonalized file rather than failing — a stale subscription keeps producing a usable calendar.

**Link placement.** The "Export as calendar" links on the voting poll step and the confirmed-info step append `&playerId=<participantId>` (they already know the current Participant). Social-sharing caveat is accepted and noted: a personalized calendar file acts as that Participant's voting capability — a forwarded file lets someone else vote *as that Participant*. The edit-page export link is untouched. Per the partial-vs-initial rule, the new link parameters are additive only; no new UI element is rendered.

**Locked sessions.** No change in behavior: the GET vote handler already short-circuits Confirmed Postponements to the confirmed-info view, so a one-click link cannot silently vote a dead date.

## Testing Decisions

A good test asserts the *external contract*: the calendar text a calendar app consumes (links present, escaped, folded, personalized or not) and the *outcome* of a click (the Vote lands on the poll, silently updates, survives the who-are-you step). It never asserts the serializer's internals.

**Seam 1 — `src/lib/ical.spec.ts`** (existing node Vitest seam, prior art: `clashes.spec.ts`, `venue-occupancy.spec.ts`; builders from `__test-utils__/builders.ts`). Extend the current builder suite:

- each VEVENT's `DESCRIPTION` contains exactly three choice links for that date, with correct values (`vote-<dateId>=Yes|IfNecessary|No`) and the right `token` / `playerId` when personalization is on;
- links are absent of `playerId` when the builder is invoked without it;
- `URL:` present, points at the poll, carries `playerId` only when personalized;
- choice labels come through as given (locale-neutral in the builder — the builder receives strings);
- new lines are still RFC 5545 escaped and line-folded within the 75-octet limit.

**Seam 2 — `join-handlers.spec.ts`** (existing handler seam, prior art: `join-handlers.spec.ts`, `edit-handlers.spec.ts`; `createSession` injection):

- `GET /vote` with a valid token + `playerId` + `vote-<dateId>=…` casts the Vote and renders the poll;
- re-vote with a different value silently updates the existing Vote;
- unknown `playerId` redirects to the register step and carries the pending choice;
- the register POST's redirect back to `/vote` appends the pending choice, which then casts on arrival;
- unknown session 404, bad token 403, invalid team 400, as today;
- `GET /join/:id/:team/calendar.ics?playerId=<me>` emits personalized links; unknown/mismatched `playerId` degrades to unpersonalized without error;
- the personal export links on the poll and confirmed-info steps append `playerId`.

**Seam 3 — e2e** (prior art: existing Playwright join-flow spec): one happy path — create a Postponement, land on the voting poll as a Participant, download the personalized `.ics`, pull a `vote-<dateId>=IfNecessary` link out of the `DESCRIPTION`, open it, and assert the poll shows that Vote as saved. One error-path assertion: a no-`playerId` link routes through the register step and still lands the Vote.

## Out of Scope

- Vote links in the edit-page export, or any change to that export.
- User accounts, tokens, or any new authentication beyond the existing invitation password (ADR-0002/ADR-0013).
- Change to Vote semantics (`IfNecessary` stays "I'll make it work if needed").
- One-click behavior on locked Postponements beyond the existing confirmed-info redirect.
- iCal import, two-way sync, alarms, attendees, recurring events.
- Changing the registration itself beyond carrying the intent through its existing redirect.

## Further Notes

- Reuses the language, capitalisation, and semantics of `CONTEXT.md`: a Vote is a Participant's `Yes`/`IfNecessary`/`No` on one Proposed Date; the per-date `votable` flag is the organizer's visibility toggle and is untouched by this feature.
- Recording an ADR is proposed (not part of this spec): the GET-casts-a-Vote surface and the identity-in-export personalization are real trade-offs a future reader would otherwise wonder about.
- The personalization scope shows in the file itself: a personal link embeds the Participant's id; a shared file's links identify no one and degrade to the who-are-you step.