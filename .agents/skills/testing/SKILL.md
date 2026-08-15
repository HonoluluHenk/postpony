---
name: testing
description: How to write and run tests for this project (PostPony). Use when adding or updating Vitest unit tests or Playwright/axe end-to-end tests, especially around fixture builders, session injection, accessibility checks, and the beer.css/heading gotchas that repeatedly trip up UI tests.
---

# PostPony Testing

This skill captures the project's testing conventions and the non-obvious gotchas that cost time and are not discoverable from the code alone. For the commands that run the tests, see the `npm-scripts` skill.

## When to Use This Skill

Use this skill whenever you need to:

- Write or update a Vitest unit test for a route handler or library function.
- Construct model test data (sessions, players, votes, ...).
- Write or update a Playwright end-to-end or accessibility test.
- Debug a strict-mode selector failure or a `.check()` that won't toggle.

## Fixture builders are the single source of truth

Model test data comes from the deep-merge partial builders in
`src/lib/__test-utils__/builders.ts`: `aSession`, `aPlayer`, `aProposedDate`,
`aVote`. Each returns a fully-populated, valid entity and accepts a deep-partial override.

- Prefer partial overrides over hand-built literals:

  ```ts
  const session = aSession({players: [aPlayer({teamId: 'away'})], proposedDates: [aProposedDate()]});
  ```

- **Any model change must update the builders in lockstep.**
  `builders.spec.ts` asserts every required field is present, so builder drift breaks compilation across every consumer. Update `builders.ts` (and its spec)
  in the same change as the model.

## Route-handler unit tests

Handlers take an `App` (see the `route-handlers` skill), so unit tests build a minimal mock `Context`, wrap it with `App.create`, and inject sessions into a `MemorySessionStore`. This is the established pattern in
`src/routes/edit/id/edit-handlers.spec.ts`:

```ts
const session = aSession();
const app = createApp({params: {id: session.id}, body: {playerName: 'Alice'}});
await app.store.save(session);             // inject into the MemorySessionStore

await handleEditPlayersPost(app);
expect((await app.store.get(session.id))?.players[0]?.name)
    .toBe('Alice');
```

- Copy the `createApp` / `MockOptions` helper from `edit-handlers.spec.ts`; it creates a `MemorySessionStore`, mocks `param`, `query`, `header`, `parseBody`, `html`, and `redirect`, and returns `'en-US'` (or `'de-CH'`) for `LOCALE_KEY` so `app.t(...)` resolves real strings. If the handler/middleware reads cookies, the mock must also provide `req.raw: {headers: new Headers(...)}` — Hono's `getCookie` reads `c.req.raw.headers`, not `c.req.header()` (see the `hono` skill).
- Assert error paths with `.rejects.toThrow(...)` — handlers signal failures by throwing `AppError`/`StateError` via `app.failure`/`app.notFound`.
- Each test gets its own `MemorySessionStore` instance (injected via `App.create(context, store)`), so tests are fully isolated from one another.

## Page Object Model

All Playwright tests use Page Object classes from `e2e-tests/pages/`:

| Class        | Page                     | Key methods / locators                                                                                                                                                  |
|--------------|--------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `StartPage`  | `/`                      | `goto()`, `createLink`, `editLink`, `switchLanguage(locale)` (via the header `<select>`), `spinner`, `main`, `banner`, `contentinfo`                                    |
| `CreatePage` | `/create`                | `goto()`, `nameInput`, `submitButton`, `create(name)` → `EditPage`                                                                                                      |
| `EditPage`   | `/edit/:id`              | `addPlayer(name)`, `addProposedDate(dt)`, `toggleAwayVotable(index)`, `homeTallySection()`, `awayTallySection()`, `status`, `ownerPassword` |
| `JoinPage`   | `/join/:id/:team?token=` | `goto(href)`, `join(name)`, `castVote(index, vote)`, `submitVotes()`, `voteForm`, `tallySection()`, `voteRadio(vote)`                                                   |
| `ScrapePage` | `/create/scrape`         | `goto()`, `pickLeague(name)`, `pickGroup(name)`, `pickTeam(name)`, `clickBack()`, `matchRow(filter)`                                                                    |

**Cross-page workflows** use `EditPage.createSession(page, name?, dates?)` — a static factory that navigates `/ → /create → /edit/:id`, returns `{session, editPage}`.

**Manual instantiation** per test — no Playwright fixtures for page objects:

```ts
const editPage = new EditPage(page);
await editPage.addProposedDate('2026-03-05T20:00');
```

## Playwright / a11y tests

- Import `test`/`expect` from `./fixtures` (not `@playwright/test`) to get the
  `checkA11y` fixture. Every test in the suite calls `await checkA11y()` at a stable UI state; it runs axe with the full WCAG 2.0/2.1/2.2 A+AA tag set and fails on any violation.
- Add `{page, checkA11y}` to the test's destructured parameters when you need `page` for a page object or a direct assertion. Use `{checkA11y}` only if the test uses no `page` at all.
- Call `checkA11y()` after all assertions have settled (modals closed, HTMX swaps complete, scroll done) — it captures whatever is on screen.
- **Prefer a11y selectors everywhere.** Use `getByRole`, `getByLabel`,
  `getByAltText` and `getByTitle` over CSS/id locators.

### beer.css radio/checkbox gotcha

beer.css visually hides native radios/checkboxes, so `.check()` on the `radio`
role fails. Toggle the control via its **label text** instead, scoped to the form so it doesn't match a summary-table header:

```ts
const voteForm = page.getByRole('form', {name: 'Vote on Proposed Dates'});
await voteForm.getByText('Yes', {exact: true})
    .click();
```

### Disambiguating headings

The layout renders an `<h1>` brand/logo alongside page `<h2>`s, so
`getByRole('heading', {name})` hits strict-mode "2 elements" errors. Always pass `{level: 2}` for page headings. Note: the edit page uses the layout `<h1>` only (no duplicate `<h2>`), so its tests use `level: 1`.

### HTMX partial vs initial render

The initial `/edit/:id` page renders `edit.eta` directly. Any UI element added via HTMX partial (e.g. the "Allow away team to vote" toggle switch in `proposed-dates-section.eta`) must also be rendered in the initial template — tests that load the page fresh hit the initial render, not the partial. Keep both in sync.

### Semantic HTML

Prefer writing semantic HTML instead of sprinkling `aria-*` attributes everywhere.'

### TypeScript validation

e2e files are type-checked separately under `tsconfig.e2e.json`; a full
`npm run lint` validates them (see the `npm-scripts` skill).

### Locale & `Accept-Language` in e2e

- Playwright navigations send `Accept-Language: en-US` by default, so pages default to `en-US` UI in tests — that is what most assertions expect.
- **Raw requests carry no `Accept-Language`.** `page.request.post(...)` (and
  `request.get`) send no `Accept-Language`, so locale resolution falls back to the server default (`de-CH`). A test that asserts English error text on a raw POST must set the header explicitly:
  `headers: {Accept: 'text/html', 'Accept-Language': 'en-US'}`.
- Date-input e2e values are locale-dependent: `EditPage.isoToLocaleTokens`
  mirrors the server formatter from `<html lang>`; use `addProposedDate('...')` /
  `createSession` with ISO values and let the page object convert.

### Coverage report gotcha

- Judge per-file coverage from a **full** `npm run test` (v8/lcov/HTML report). The istanbul **text** reporter silently drops subdirectory groups that are fully covered in a single file (e.g. `src/lib/middleware/language.ts` at 100% vanished from the text table but shows in `coverage/lcov.info` and the HTML report). The `lcov` and `html` reporters are authoritative.
- A `--coverage` run limited to one spec reports a misleading global percentage (coverage `all` semantics) — don't infer per-file coverage from it.

## Conventions

- Place unit tests alongside the source as `*.spec.ts`; e2e tests live in
  `e2e-tests/` as `*.e2e.ts`.
- Put everything possible inside a top-level `describe`.
- Coverage must stay **>= 80%** (branch, statement, line, functions).
- Never weaken assertions, skip, or disable tests to make a run pass.
