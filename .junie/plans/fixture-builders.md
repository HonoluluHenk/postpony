---
sessionId: session-260715-223049-bhcl
---

# Requirements

### Overview & Goals

Implement fixture builders for key model entities to simplify test data setup. Currently, creating a `RescheduleSession` (and its nested entities) requires spelling out every required field inline. A builder pattern provides sensible defaults and a fluent API so tests only specify the fields they care about.

### Scope

**In Scope:**

- Fixture builder for `RescheduleSession` (the most complex entity with 11+ required fields)
- Fixture builders for entities commonly nested inside it: `Player`, `ProposedDate`, `Vote`, `Venue`
- Sensible defaults for all required fields (deterministic, no randomness unless overridden)
- Placed in a shared test-utilities location, usable by both unit tests and any future integration tests

**Out of Scope:**

- Builders for non-model types (e.g. Hono `Context`, `App` — these are mocked differently)
- E2E/Playwright fixture changes (those use browser-level fixtures, not model builders)
- Changes to production code

### Functional Requirements

- Each builder produces a valid, fully-populated entity by default (calling `.build()` with no overrides returns a usable object)
- Each builder supports partial overrides via `.with({ field: value })` or similar fluent API
- `RescheduleSessionBuilder` supports convenience methods to add players, proposed dates, and votes without manual ID wiring
- Builders are strongly typed — TypeScript enforces that overrides match the entity interface

# Technical Design

### Current Implementation

- **Models** (`src/lib/models.ts`): 5 entity interfaces — `RescheduleSession`, `Player`, `ProposedDate`, `Vote`, `Venue`
- **`RescheduleSession`** is the most complex: `id`, `clubId`, `name`, `ownerPasswordHash`, `invitationPasswordHash`, `status`, `players[]`, `proposedDates[]`, `createdAt`, plus optional `maxOverlaps`, `venueId`, `opponentVenueId`, `originalMatchDateTime`, `metadata`
- **No existing fixture helpers** for models — the only current test fixtures are HTML files for the scraper (`src/lib/__fixtures__/`) and Playwright's `AxeBuilder` fixture (`e2e-tests/fixtures.ts`)
- **Current test count**: 6 spec files under `src/`, none of which create `RescheduleSession` objects. The upcoming voting feature will need many tests with sessions + players + votes, making this a timely investment.
- **`DateTimeRange`** (`src/lib/temporal-utils.ts`) uses `Temporal.PlainDateTime` — the `Venue` builder needs to produce valid instances.

### Key Decisions

1. **Plain function + `merge` pattern, not a class**: Each builder is a function `aSession(overrides?)` returning the entity. This matches the ponytail philosophy — minimal code, no class ceremony. A helper like `aSession({ status: 'Voting', players: [aPlayer()] })` is one expression.
2. **Deep merge via `lodash-es`**: Use `merge` from `lodash-es` instead of spread (`...`). This correctly deep-merges nested objects (e.g. overriding only `dateTimeRange.start` without losing `end`). Install `lodash-es` and `@types/lodash-es` as dev dependencies.
3. **Deterministic defaults**: Use fixed strings like `'test-id'`, `'test-club'`, `'hashed-owner-pw'` etc. No crypto calls in builders — tests should be fast and deterministic.
4. **File location**: `src/lib/__test-utils__/builders.ts` — co-located with the models in `src/lib/`, clearly marked as test-only via the `__test-utils__` directory name. Single file since there are only 5 entities.
5. **Convenience methods on session builder**: `aSession()` returns a plain object, but we add composable helpers like `withPlayers(...players)` and `withProposedDates(...dates)` as chainable spread helpers.

### Proposed Changes

#### New file: `src/lib/__test-utils__/builders.ts`

Builder functions for each entity:

```typescript
import merge from 'lodash-es/merge';
import type { Player, ProposedDate, RescheduleSession, RescheduleStatus, Venue, Vote } from '../models';

export function aPlayer(overrides: Partial<Player> = {}): Player {
    return merge({
        id: 'player-1',
        name: 'Test Player',
        teamId: 'home-team',
    }, overrides);
}

export function aProposedDate(overrides: Partial<ProposedDate> = {}): ProposedDate {
    return merge({
        id: 'proposed-date-1',
        sessionId: 'test-session',
        dateTimeRange: {
            start: '2025-09-01T20:00:00',
            end: '2025-09-01T22:00:00',
        },
        proposerId: 'player-1',
    }, overrides);
}

export function aVote(overrides: Partial<Vote> = {}): Vote {
    return merge({
        id: 'vote-1',
        proposedDateId: 'proposed-date-1',
        participantId: 'player-1',
        type: 'Yes',
    }, overrides);
}

export function aVenue(overrides: Partial<Venue> = {}): Venue {
    return merge({
        id: 'venue-1',
        clubId: 'test-club',
        name: 'Test Venue',
        availability: [],
        bookings: [],
    }, overrides);
}

export function aSession(overrides: Partial<RescheduleSession> = {}): RescheduleSession {
    return merge({
        id: 'test-session',
        clubId: 'test-club',
        name: 'Test Reschedule',
        ownerPasswordHash: 'hashed-owner-pw',
        invitationPasswordHash: 'hashed-invitation-pw',
        status: 'Draft' as RescheduleStatus,
        players: [],
        proposedDates: [],
        createdAt: '2025-01-01T00:00:00.000Z',
    }, overrides);
}
```

#### Usage examples

```typescript
// Minimal — all defaults
const session = aSession();

// Override specific fields
const votingSession = aSession({
    status: 'Voting',
    players: [aPlayer(), aPlayer({id: 'player-2', name: 'Bob', teamId: 'away'})],
    proposedDates: [aProposedDate(), aProposedDate({id: 'pd-2'})],
});

// Compose nested entities
const player = aPlayer({id: 'p1', teamId: 'home'});
const vote = aVote({participantId: player.id, type: 'Maybe'});
```

### File Structure

```
src/lib/__test-utils__/       (new directory)
  └── builders.ts             (all entity builders)
  └── builders.spec.ts        (self-check: each builder produces a valid entity)
```

# Testing

### Validation Approach

- A spec file `builders.spec.ts` alongside the builders verifies each builder returns a well-formed entity with all required fields populated.
- Lint check passes (`npm run lint`).

### Key Scenarios

1. `aSession()` returns a valid `RescheduleSession` with all required fields
2. `aSession({ status: 'Voting' })` overrides only the status, keeps all other defaults
3. `aPlayer()`, `aProposedDate()`, `aVote()`, `aVenue()` each return valid instances
4. Overrides with nested objects merge correctly (e.g. `aProposedDate({ dateTimeRange: { start: '...', end: '...' } })`)

# Delivery Steps

### Step 1: Create entity fixture builders
All five entity builders exist in a shared test-utils file with sensible defaults.

- Create `src/lib/__test-utils__/builders.ts` with `aSession()`, `aPlayer()`, `aProposedDate()`, `aVote()`, `aVenue()` builder functions
- Each function accepts `Partial<Entity>` overrides and deep-merges them over defaults using `merge` from `lodash-es`
- Install `lodash-es` and `@types/lodash-es` as dev dependencies
- Defaults are deterministic (fixed strings/values, no crypto or Date.now())
- Verify `npm run lint` passes

### Step 2: Add self-check tests and verify
Each builder is verified to produce valid, well-formed entities.

- Create `src/lib/__test-utils__/builders.spec.ts`
- Test each builder returns all required fields when called with no arguments
- Test that partial overrides are applied correctly
- Test that nested object overrides deep-merge correctly (e.g. `aProposedDate({ dateTimeRange: { start: '2025-10-01T18:00:00' } })` keeps the default `end`)
- Run tests and lint to confirm everything passes
