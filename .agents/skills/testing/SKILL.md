---
name: testing
description: How to write and run tests for this project (PostPony). Use when adding or updating Vitest unit tests or Playwright/axe end-to-end tests, especially around fixture builders, session injection, accessibility checks, and the beer.css/heading gotchas that repeatedly trip up UI tests.
---

# PostPony Testing

This skill captures the project's testing conventions and the non-obvious
gotchas that cost time and are not discoverable from the code alone. For the
commands that run the tests, see the `npm-scripts` skill.

## When to Use This Skill

Use this skill whenever you need to:

- Write or update a Vitest unit test for a route handler or library function.
- Construct model test data (sessions, players, votes, ...).
- Write or update a Playwright end-to-end or accessibility test.
- Debug a strict-mode selector failure or a `.check()` that won't toggle.

## Fixture builders are the single source of truth

Model test data comes from the deep-merge partial builders in
`src/lib/__test-utils__/builders.ts`: `aSession`, `aPlayer`, `aProposedDate`,
`aVote`, `aVenue`. Each returns a fully-populated, valid entity and accepts a
deep-partial override.

- Prefer partial overrides over hand-built literals:

  ```ts
  const session = aSession({players: [aPlayer({teamId: 'away'})], proposedDates: [aProposedDate()]});
  ```

- **Any model change must update the builders in lockstep.**
  `builders.spec.ts` asserts every required field is present, so builder drift
  breaks compilation across every consumer. Update `builders.ts` (and its spec)
  in the same change as the model.

## Route-handler unit tests

Handlers take an `App` (see the `route-handlers` skill), so unit tests build a
minimal mock `Context`, wrap it with `App.create`, and inject sessions directly
into the in-memory store. This is the established pattern in
`src/routes/edit/id/edit-handlers.spec.ts`:

```ts
const session = aSession();
const app = createApp({params: {id: session.id}, body: {playerName: 'Alice'}});
app.sessions[session.id] = session;      // inject into the in-memory store

await handleEditPlayersPost(app);
expect(session.players[0]?.name)
    .toBe('Alice');
```

- Copy the `createApp` / `MockOptions` helper from `edit-handlers.spec.ts`; it
  mocks `param`, `query`, `header`, `parseBody`, `html`, and `redirect`, and
  returns `'en'` for `LOCALE_KEY` so `app.t(...)` resolves real strings.
- Assert error paths with `.rejects.toThrow(...)` — handlers signal failures by
  throwing `AppError`/`StateError` via `app.failure`/`app.notFound`.
- `app.sessions` is a **static** record shared across `App` instances, so seed
  it per test; don't rely on isolation between the store and a fresh `App`.

## Playwright / a11y tests

- Import `test`/`expect` from `./fixtures` (not `@playwright/test`) to get the
  `checkA11y` fixture. Call `await checkA11y()` after reaching each significant
  UI state; it runs axe with the full WCAG 2.0/2.1/2.2 A+AA tag set and fails on
  any violation. Prefer role/label selectors (`getByRole`, `getByLabel`).
- **beer.css visually hides native radios/checkboxes**, so `.check()` on the
  `radio` role fails. Toggle the control via its **label text** instead, scoped
  to the form so it doesn't match a summary-table header:

  ```ts
  const voteForm = page.locator('form');
  await voteForm.getByText('Yes', {exact: true}).click();
  ```

- **Disambiguate headings by level.** The layout renders an `<h1>` brand/logo
  alongside page `<h2>`s, so `getByRole('heading', {name})` hits strict-mode
  "2 elements" errors. Always pass `{level: 2}` for page headings.
- e2e files are type-checked separately under `tsconfig.e2e.json`; a full
  `npm run lint` validates them (see the `npm-scripts` skill).

## Conventions

- Place unit tests alongside the source as `*.spec.ts`; e2e tests live in
  `e2e-tests/` as `*.e2e.ts`.
- Put everything possible inside a top-level `describe`.
- Coverage must stay **>= 80%** (branch, statement, line, functions).
- Never weaken assertions, skip, or disable tests to make a run pass.
