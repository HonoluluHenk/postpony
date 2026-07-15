---
sessionId: session-260716-001844-1oi8
---

# Requirements

### Overview & Goals

Implement fixture builders for key model entities to simplify test data setup. Creating a `RescheduleSession` (and its nested entities) currently requires spelling out every required field inline. A builder pattern provides sensible defaults and a fluent, strongly-typed API so tests only specify the fields they care about.

### Scope

**In Scope:**

- Fixture builder for `RescheduleSession` (the most complex entity with 9 required + 5 optional fields)
- Fixture builders for entities commonly nested inside it: `Player`, `ProposedDate`, `Vote`, `Venue`
- Sensible, deterministic defaults for all required fields (no randomness, no crypto, no `Date.now()`)
- Placed in a shared test-utilities location, usable by unit tests and any future integration tests

**Out of Scope:**

- Builders for non-model types (e.g. Hono `Context`, `App` — mocked differently)
- E2E/Playwright fixture changes (browser-level fixtures in `e2e-tests/fixtures.ts`)
- Any changes to production code

### Functional Requirements

- Each builder produces a valid, fully-populated entity by default (calling with no arguments returns a usable object).
- Each builder accepts partial overrides via a `Partial<Entity>` argument that deep-merges over defaults.
- Overrides of nested objects merge correctly (e.g. overriding only `dateTimeRange.start` keeps the default `end`).
- Builders are strongly typed — TypeScript enforces that overrides match the entity interface and that returned objects satisfy the entity type.

# Technical Design

### Current Implementation

- **Models** (`src/lib/models.ts`): 5 entity interfaces — `RescheduleSession`, `Player`, `ProposedDate`, `Vote`, `Venue` — plus `AvailabilityRecord` and the `RescheduleStatus` union.
- **`RescheduleSession`** required fields: `id`, `clubId`, `name`, `ownerPasswordHash`, `invitationPasswordHash`, `status`, `players[]`, `proposedDates[]`, `createdAt`; optional: `maxOverlaps`, `venueId`, `opponentVenueId`, `originalMatchDateTime`, `metadata`.
- **`ProposedDate.dateTimeRange`** is an inline `{ start: string; end: string }` (ISO strings) — NOT the Temporal-based `DateTimeRange`.
- **`Venue.availability` / `Venue.bookings`** are `DateTimeRange[]` from `src/lib/temporal-utils.ts`, which use `Temporal.PlainDateTime`. Defaults use empty arrays, so no Temporal instances are needed by default.
- **`Vote.type`** is the literal union `'Yes' | 'No' | 'Maybe'`; `RescheduleStatus` is a 5-value literal union.
- **No existing model fixture helpers** — current fixtures are scraper HTML files (`src/lib/__fixtures__/`) and Playwright's `AxeBuilder` fixture. 6 spec files exist under `src/`, using top-level `describe` + `vitest`.

### Key Decisions

1. **Plain function + deep-merge pattern, not a class**: Each builder is a function `aSession(overrides?)` returning the entity. Minimal code, no class ceremony; composition is a single expression.
2. **Deep merge via `lodash-es`**: Use `merge` from `lodash-es` (with `@types/lodash-es`) so nested object overrides merge instead of replacing. Added as dev dependencies.
3. **Deterministic defaults**: Fixed strings like `'test-session'`, `'test-club'`, `'hashed-owner-pw'`. No crypto, no `Date.now()` — fast and deterministic.
4. **File location**: `src/lib/__test-utils__/builders.ts`, co-located with the models and clearly marked test-only. Single file for all 5 builders.
5. **Literal-union typing**: Because `merge` widens literals to `string`, defaults for `status` and `Vote.type` use `as const`/explicit casts (e.g. `status: 'Draft' as RescheduleStatus`) so the declared return type is satisfied.

### Proposed Changes

New file `src/lib/__test-utils__/builders.ts` exporting `aPlayer`, `aProposedDate`, `aVote`, `aVenue`, `aSession`, each `function`-declared, each taking `overrides: Partial<Entity> = {}` and returning `merge(defaults, overrides)`.

```typescript
import merge from 'lodash-es/merge';
import type { Player, ProposedDate, RescheduleSession, RescheduleStatus, Venue, Vote } from '../models';

export function aPlayer(overrides: Partial<Player> = {}): Player {
  return merge({ id: 'player-1', name: 'Test Player', teamId: 'home-team' }, overrides);
}

export function aProposedDate(overrides: Partial<ProposedDate> = {}): ProposedDate {
  return merge({
    id: 'proposed-date-1',
    sessionId: 'test-session',
    dateTimeRange: { start: '2025-09-01T20:00:00', end: '2025-09-01T22:00:00' },
    proposerId: 'player-1',
  }, overrides);
}

export function aVote(overrides: Partial<Vote> = {}): Vote {
  return merge({ id: 'vote-1', proposedDateId: 'proposed-date-1', participantId: 'player-1', type: 'Yes' as Vote['type'] }, overrides);
}

export function aVenue(overrides: Partial<Venue> = {}): Venue {
  return merge({ id: 'venue-1', clubId: 'test-club', name: 'Test Venue', availability: [], bookings: [] }, overrides);
}

export function aSession(overrides: Partial<RescheduleSession> = {}): RescheduleSession {
  return merge({
    id: 'test-session', clubId: 'test-club', name: 'Test Reschedule',
    ownerPasswordHash: 'hashed-owner-pw', invitationPasswordHash: 'hashed-invitation-pw',
    status: 'Draft' as RescheduleStatus, players: [], proposedDates: [],
    createdAt: '2025-01-01T00:00:00.000Z',
  }, overrides);
}
```

### File Structure

```
src/lib/__test-utils__/       (new directory)
  ├── builders.ts             (all entity builders)
  └── builders.spec.ts        (self-check: each builder produces a valid entity)
```

# Testing

### Validation Approach

- A co-located `builders.spec.ts` verifies each builder returns a well-formed entity with all required fields populated and that overrides apply correctly.
- `npm run lint` (tsc + eslint, warnings-as-errors) and `npm test` (vitest) must pass.

### Key Scenarios

1. `aSession()` returns a valid `RescheduleSession` with every required field populated.
2. `aSession({ status: 'Voting' })` overrides only `status`, keeping all other defaults.
3. `aPlayer()`, `aProposedDate()`, `aVote()`, `aVenue()` each return valid instances by default.
4. Composition works: `aSession({ players: [aPlayer(), aPlayer({ id: 'player-2' })], proposedDates: [aProposedDate()] })`.

### Edge Cases

- Nested override deep-merges: `aProposedDate({ dateTimeRange: { start: '2025-10-01T18:00:00' } })` keeps the default `end`.
- Literal-union fields keep correct types after override (e.g. `aVote({ type: 'Maybe' })`).

# Delivery Steps

### ✓ Step 1: Create entity fixture builders
All five entity builders exist in a shared test-utils file with deterministic defaults.

- Add `lodash-es` and `@types/lodash-es` as dev dependencies in `package.json`.
- Create `src/lib/__test-utils__/builders.ts` exporting `function`-declared `aPlayer()`, `aProposedDate()`, `aVote()`, `aVenue()`, and `aSession()`.
- Each function accepts `Partial<Entity>` overrides and deep-merges them over defaults using `merge` from `lodash-es`.
- Use deterministic defaults (fixed strings, no crypto, no `Date.now()`).
- Cast literal-union defaults (`status`, `Vote.type`) so the declared return types are satisfied.
- Verify `npm run lint` passes.

### ✓ Step 2: Add self-check tests and verify
Each builder is verified to produce valid, well-formed entities and to merge overrides correctly.

- Create `src/lib/__test-utils__/builders.spec.ts` with a top-level `describe`.
- Test each builder returns all required fields when called with no arguments.
- Test that partial overrides are applied (e.g. `aSession({ status: 'Voting' })`).
- Test nested-object deep-merge (e.g. `aProposedDate({ dateTimeRange: { start: '2025-10-01T18:00:00' } })` keeps the default `end`).
- Run `npm test` and `npm run lint` to confirm everything passes.