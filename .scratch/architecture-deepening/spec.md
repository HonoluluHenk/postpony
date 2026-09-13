# Deepen the edit, create, join and domain modules

**Status:** ready-for-agent

## Problem Statement

The edit page, create route and join voting have accumulated shallow route modules. Seven edit POST handlers reimplement the same `load → apply rule → save → render-or-redirect` skeleton, so each handler's interface is nearly as complex as its implementation. The edit view's props are declared three times plus a hand-written field copy. Handlers read Hono's `Context` directly, so each of seven specs hand-rolls a different fake. Postponement creation bypasses the domain module's `newId`/`now` seam and uses a second clock. The Clash predicate is copied four times, the venue-1 default six times, and vote application is implemented twice (GET and POST). The cost is low locality — one concept spread across many files — and low leverage: no single interface the tests can target.

## Solution

Seven behaviour-preserving deepenings, each moving behaviour behind a smaller interface at a clean seam, ordered so that earlier tickets make later ones easier:

1. **Edit command seam** — one module owns the edit POST pipeline for all seven mutations.
2. **Edit read model** — the edit view interface is declared once; the hand-written prop copy deletes.
3. **App request/response seam** — `App` covers request reads and responses; `Context` becomes private.
4. **Creation seam** — `PostponementRules.create` owns Draft invariants and the id/clock seam; the second clock deletes.
5. **Clash predicate** — clash predicate and attach/deselect centralize; the fetch helper moves to a neutral module.
6. **Venue resolution** — one module for the venue-1 default and lookup; six copies collapse.
7. **Vote application** — one `applyVotes` operation serves both join verbs.

## Implementation Decisions

### Guardrails (every ticket)

- **Strict refactor.** E2E tests and screenshot baselines stay unchanged. Existing render specs stay green unless a ticket says otherwise. Only internal structure changes.
- **Characterization-first.** Extract the seam behind the existing spec; port the failure matrix to tests that target the new seam; delete or shrink the legacy spec only once the new tests cover the same branches.
- **Coverage ≥ 90%** for all metrics; `npm run verify` passes per ticket.
- **Vocabulary.** Tickets use the domain language in `CONTEXT.md` (Postponement, Proposed Date, Clash, Venue, Vote, Participant) and the architecture terms module / interface / depth / seam / adapter / leverage / locality.

### Ticket-specific decisions

- **01 Edit command seam.** `runEditCommand` owns load, not-found guard, save-when-changed, and partial-render-or-redirect. A handler supplies a callback `(rules, session) => session`, a `message` that may be a function of the updated session, and optional render extras; it may return a `Response` as an escape hatch (add-dates' custom 400 branches). Covers all seven edit POSTs, including add-dates and refresh-clashes.
- **02 Edit read model.** Props-only. `EditGridProps` stays the single declaration; `EditPageProps` extends it (drop its duplicate `proposedDateTime`); `EditPartialExtras = Pick<EditGridProps, …>`. The session-derived display fields move into `buildEditPartialsData`, so `renderEditPartials` becomes one spread. The rail's ISO-week grouping and availability sort stay in the view.
- **03 App request/response seam.** Methods on `App`: `query`, `body(options)` (covering `{all:true}`), `header`, `currentUrl`; responses `html`, `redirect`, `text`, `setHeader`. `App.c` becomes private, with `App.create` the only `Context` consumer. One shared test fake replaces the bespoke per-spec contexts.
- **04 Creation seam.** `PostponementRules.create(input)` takes scraped fields plus precomputed hashes, derives the name via `derivePostponementName`, and owns ids, `createdAt` and Draft invariants through `newId`/`now`. Delete `timestamp.ts` and `App.timestamp`.
- **05 Clash predicate.** Pure: an `isDateClashing` predicate plus the attach/deselect session rule centralize (in the Clash module). The route keeps the fetch and its degradation; the async fetch helper moves to a neutral edit-directory module so the refresh handler stops importing the add-dates handler. The duplicated buffered-window scan merges.
- **06 Venue resolution.** `defaultVenueNumber`, `resolveVenue` and `venueShortName` live in `src/lib/venues.ts` (JSX-free); the `VenueBadge` component consolidates into `src/routes/partials/venues.tsx` and imports the helpers. Occupancy, iCal, badges, dedup and the rail call the one default.
- **07 Vote application.** `PostponementRules.applyVotes(session, submitted: readonly {dateId, value}[]) → {session, changed}` owns the votable-date filter. The GET and POST handlers build the submission list and stop duplicating the loop.

## Ticket order

A linear chain: 01 → 02 → 03 → 04 → 05 → 06 → 07. Tickets 01–03 touch the same edit modules, so they are sequenced to avoid conflicting edits; 04–07 are independent in principle but are sequenced to keep one worktree and one branch at a time.

## Testing Decisions

- A good test asserts behaviour through the new seam's interface, not through rendered HTML strings where a seam now exists.
- **Unit (Vitest).** Each seam gets tests that target its interface: the command seam's pipeline branches, the read-model projection, the App request/response fake, `create`'s Draft invariants, `isDateClashing`, the venue default, and `applyVotes` including the changed flag and votable-date filter.
- **E2E (Playwright).** Existing postpone-editing and join-voting specs are the regression net; they stay unchanged and green. No new user-visible behaviour is added, so no new e2e is required except where a ticket's acceptance criteria asks for one.
- The legacy `edit-handlers.spec.ts` failure matrix is ported to the command seam before the legacy file is deleted or shrunk.

## Out of Scope

- iCal borrowing the Clash buffer constant, and iCal hardcoded labels (the eighth review candidate).
- Any user-visible change, new locale strings, new routes, or new runtime dependencies.
- Extracting the rail's grouping/sort rules (the read-model ticket is props-only by decision).
- Organizer-password verification, which no route currently performs.
- Reworking `ProposedDate` precision or write-only model fields.

## Comments
