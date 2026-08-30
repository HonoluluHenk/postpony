# Spec: Venues

Status: ready-for-agent

## Problem Statement

When proposing dates for a postponed match, the organizer cannot specify which venue (hall) the rescheduled match should be held at. click-tt.ch tracks venues per club (e.g. "Turnhalle orange, Dennigkofenweg 169") and shows the venue number in the "Ort" column of the team portrait. Two different proposed dates at the same time but at different venues should be allowed (they are not duplicates).

## Solution

Add a `Venue` concept to the Postponement: venues are scraped from the click-tt club page during creation, attached to the Postponement, and a venue-number dropdown is added to the proposed-date forms. Duplicates are keyed by `(datetime, venueNumber)` instead of datetime alone. Clashes remain venue-agnostic (time-overlap only).

## User Stories

1. As an organizer creating a Postponement via click-tt, I want the system to automatically scrape my club's venues so that I can select the correct venue when proposing dates
2. As an organizer creating a Postponement manually, I want a venue dropdown with numbers 1–10 so that I can still assign a venue even without scraped venue names
3. As an organizer proposing a single date on the edit page, I want to select a venue number from a dropdown (defaulting to 1) so that the proposed date records which venue it applies to
4. As an organizer using the date generator, I want to select a venue number from a dropdown (defaulting to 1) so that all generated dates are associated with the same venue
5. As an organizer, I want two proposed dates at the same time but different venues to both exist (not be deduplicated) so that I can propose the same time slot at different halls
6. As a participant viewing the poll, I want to see the venue number next to each proposed date so that I know which venue the date is for
7. As an organizer, I want clashes to still be computed regardless of venue (a time clash on any venue is still a clash) so that I am warned about schedule conflicts even if I change venues
8. As an organizer, I want the venue dropdown to show the venue name (e.g. "1 – Turnhalle orange") so that I know which physical location each number refers to
9. As a system, I want to validate that a submitted venueNumber falls within the known venues (or 1–10 when none are known) so that invalid venue numbers are rejected
10. As a system, I want existing proposed dates (created before this feature) to default to venue 1 so that legacy data continues to work without migration

## Implementation Decisions

### Domain model changes

- **New `Venue` interface** in `src/lib/models.ts`:
  ```typescript
  export interface Venue {
    venueNumber: number;
    name: string;
    address: string;
    postalCode: string;
    city: string;
  }
  ```
- **`Postponement` gains** `venues: Venue[]` — snapshotted at creation, locked thereafter.
- **`ProposedDate` gains** `venueNumber?: number` — optional for backward compatibility; absence means venue 1.

### Scraper changes

- **New `fetchVenues(clubId)` function** in `src/lib/click-tt-scraper.ts` — scrapes `clubInfoDisplay?club=<id>` and returns `Venue[]`.
- **New `extractClubId(root)` function** in `src/lib/click-tt-scraper.ts` — extracts the organizer's club ID from the team page HTML (first `a[href*="clubInfoDisplay"]` link). Exported for use in `match-post.ts`.
- **`fixtureNameForUrl`** gains a `clubInfoDisplay` branch for fixture mapping.
- Venue scraping runs in parallel with player scraping during match creation (`match-post.ts`).
- Manual postponements start with an empty `venues` array.

### Proposed date generation

- **Dedup key changes** from `canonicalMinuteKey(datetime)` to a composite `(datetime, venueNumber)` — same time at different venues is allowed. The `existingStarts` set in `generateProposedDates` is replaced or augmented with composite keys.
- **Seam choice**: The dedup change is made at the handler level (`proposed-dates-post.ts`), not in `generateProposedDates`. The handler builds composite keys from `(pd.dateTimeRange.start, pd.venueNumber ?? 1)` and passes them to the generator. The generator's `existingStarts` parameter becomes semantically "existing keys" — no signature change needed if the handler maps the composite into strings (e.g. `"datetime|venueNumber"`).
- **Alternative seam** (preferred): Add `venueNumber` as an optional field to `ProposedDateTuple` (the input to `generateProposedDates`), and change `existingStarts` to accept composite entries. The generator yields composite entries back. This keeps the generator pure and testable.
- **Decision**: Change the dedup at the handler level only. The handler builds a set of `"\${start}|\${venueNumber}"` strings from existing dates and passes this as `existingStarts`. The generator doesn't need to know about venues. This keeps the change minimal — one seam, the handler.

### Validation

- Server validates venueNumber: if `venues.length > 0`, must be `1..venues.length`; if `venues.length === 0`, must be `1..10`.
- Valibot schema augmented with a dynamic `check` predicate based on session.venues.

### UI changes

- **Single-date form** (`proposed-dates-post.ts` single submit path): adds a `<select>` for venue number. Default: `1`.
- **Generator form** (tuple submit path): adds a `<select>` for venue number. Default: `1`.
- **Proposed dates list** (edit view and poll views): shows venue number (e.g. "V1") next to each date.
- **Dropdown/tooltip**: shows "1 – Turnhalle orange" (number + name) for venues with names; just the number for empty venue lists.
- The venue dropdown renders with all known venue names; for empty venue lists, shows fixed `1–10`.

### Clash semantics unchanged

- `computeClashes` and `attachClashes` are untouched. Clashes remain purely time-based.

### Fixture updates

- New fixture file `club-venues.html` for a sample club info page with venue listings.
- The `fetchVenues` scraper is unit-tested against this fixture.

## Testing Decisions

### What makes a good test

- Test external behavior only: given a session with venues, proposing a date with a venue number produces the correct `ProposedDate` with that `venueNumber`.
- Test dedup: two dates at the same datetime + same venue → only one created; same datetime + different venue → both created.
- Test validation: venueNumber outside valid range is rejected.
- Do not test HTML parsing internals — test the scraper's output contract.

### Modules to test

- **`click-tt-scraper.spec.ts`** — add tests for `fetchVenues` against the `club-venues.html` fixture, and `extractClubId` against existing `team.html` fixtures.
- **`proposed-dates-generator.spec.ts`** — no changes needed (dedup is at the handler level).
- **`proposed-dates-post.ts` handler tests** (`edit-handlers.spec.ts`) — add tests for:
    - Single date with venue number → `ProposedDate.venueNumber` set correctly
    - Generator with venue number → all generated dates share that venue
    - Dedup: same datetime + same venue → deduplicated; same datetime + different venue → both accepted
    - Validation: venueNumber out of range → error
    - Empty venues → accepts 1–10
- **Unit tests** for new `Venue` type in models (no logic, type-level only).
- **E2E tests** (`proposed-date-generator.e2e.ts`) — add a test that proposes dates with a venue number and verifies the venue appears in the list.
- **Browser tests** — if venue dropdown rendering is tested client-side, add a browser test for the venue `<select>` element.

### Prior art

- `edit-handlers.spec.ts` already tests the proposed dates generator extensively with `generateProposedDates` assertions.
- `click-tt-scraper.spec.ts` tests all existing scrapers against HTML fixtures.
- `proposed-date-generator.e2e.ts` tests the full generator flow in Playwright.

## Out of Scope

- Editing/deleting venues after creation (venue list is locked).
- Storing the original match's venue number from the team portrait "Ort" column.
- Venue-specific clash computation (clashes remain time-only).
- A dedicated venue management UI on the edit page.
- Multi-club venue resolution (still single `clubId` per Postponement).
- Changing the default venue based on the original match's venue.

## Further Notes

- The club ID is extracted from the team page's first `a[href*="clubInfoDisplay"]` link. This is the organizer's club (e.g. Ostermundigen → club 33282).
- Venue numbers are 1-based and correspond to the order on the club info page.
- The `venueNumber` field on `ProposedDate` is typed as `number | undefined` (optional) so that legacy dates created before this feature default to venue 1 at read time.
- The CONTEXT.md glossary will be updated with the `Venue` term.
