# PostPony — Agent Guidelines

A web app for postponing sports matches. SSR (Hono + Eta + HTMX), no SPA framework.

### Clarifying Questions Policy

* Before beginning any coding task, review the provided acceptance criteria.
* If requirements are ambiguous, or if two paths offer different product consequences, do not make assumptions.
* Instead, state your confidence level and ask targeted clarifying questions about missing features or parameters.
* Wait for my answers before making any irreversible changes to the codebase.

## General instructions

* Keep answers short and concise.
* Keep everything strongly typed (not "stringly").
* Keep coverage >= 80% for all metrics
* Implement E2E tests for the happy path and some likely error-paths

## Quick reference

| Command                   | What it does                                                                       |
|---------------------------|------------------------------------------------------------------------------------|
| `npm run dev`             | Dev server with fixtures on port 3000                                              |
| `npm run dev:live`        | Dev server against live click-tt.ch                                                |
| `npm run test`            | Vitest (coverage on, `@/` → `src/`)                                                |
| `npm run lint`            | `tsc --noEmit` → `tsc -p tsconfig.e2e.json --noEmit` → `eslint . --max-warnings 0` |
| `npm run lint:eslint:fix` | Auto-fix ESLint                                                                    |
| `npm run e2e`             | Playwright (starts its own server on port 3001, never reuses dev server)           |
| `npm run verify`          | lint → test → build → e2e (full CI gate)                                           |
| `npm run build`           | Vite build (SSR) → `dist/`                                                         |

## Local configuration

For local development, copy `.env-template` to `.env` (git-ignored) and adjust the values there. `src/config.ts` loads `.env` from the repo root at startup via native `process.loadEnvFile`; already-set env vars (shell/npm scripts) take precedence.

## HTTPS & certificates

The app only runs on HTTPS. Certs live at `developer-local-settings/conf/certs/<hostname>.pem` / `.key`. Generate them: `scripts/create-certs.sh` (requires `mkcert` from mise). URL: `https://game-scheduler.localhost:3000`

## Ponytail, lazy senior dev mode

You are a lazy senior developer. Lazy means efficient, not careless. The best code is the code never written.

Before writing any code, stop at the first rung that holds:

* Does this need to be built at all? (YAGNI)
* Does the standard library already do this? Use it.
* Does a native platform feature cover it? Use it.
* Does an already-installed dependency solve it? Use it.
* Can this be one line? Make it one line.
* Only then: write the minimum code that works.

Rules:

* No abstractions that weren't explicitly requested.
* No new dependency if it can be avoided.
* No boilerplate nobody asked for.
* Deletion over addition. Boring over clever. Fewest files possible.
* Question complex requests: "Do you actually need X, or does Y cover it?"
* Pick the edge-case-correct option when two stdlib approaches are the same size, lazy means less code, not the flimsier algorithm.
* Mark intentional simplifications with a ponytail: comment. If the shortcut has a known ceiling (global lock, O (n²) scan, naive heuristic), the comment names the ceiling and the upgrade path.

Examples:

- `// ponytail: using local Map for sessions; upgrade to Redis for horizontal scaling.`
- `// ponytail: naive O(n) scan for venue availability; upgrade to interval tree if venue count > 50.`

Not lazy about: input validation at trust boundaries, error handling that prevents data loss, security, accessibility, the calibration real hardware needs (the platform is never the spec ideal, a clock drifts, a sensor reads off), anything explicitly requested. Lazy code without its check is unfinished: non-trivial logic leaves ONE runnable check behind, the smallest thing that fails if the logic breaks (an assert-based demo/self-check or one small test file; no frameworks, no fixtures). Trivial one-liners need no test.

## Project structure

```
src/
  index.ts            — server entry, Hono app wiring, HTTPS server
  app.ts              — App class wrapping Hono Context (render, t, store, isPartial, requireParam, failure, notFound)
  config.ts           — convict config: APP_PORT, APP_HOSTNAME, APP_BASE_URL, APP_USE_FIXTURES, APP_CLICK_TT_FIXTURES_DIR, APP_DB_URL, APP_DB_AUTH_TOKEN
  routes/             — per-feature routers (create/, edit/, join/) with *-get.ts / *-post.ts handlers and *.eta templates
  lib/
    reschedule.ts     — domain module: pure operations on RescheduleSession, overridable newId()/now() seam
    models.ts         — RescheduleSession, Player, ProposedDate, Vote, Venue interfaces
    errors.ts         — AppError (400), StateError (404), InternalError (500), ClickTTError
    __test-utils__/builders.ts — deep-partial fixture builders (aSession, aPlayer, aProposedDate, aVote, aVenue)
  locales/            — en.json, de.json; TranslationKeys type derived from en.json keys
  public/assets/
    css/design-tokens.css — design tokens in @layer design
    vendor/           — BeerCSS (Material 3) in @layer vendor
e2e-tests/
  pages/              — Page Object Model classes (StartPage, CreatePage, EditPage, JoinPage, ScrapePage)
  fixtures.ts         — Custom Playwright fixtures (checkA11y, makeAxeBuilder)
docs/adr/             — 14 ADRs
```

## Framework patterns

- **Handlers**: `factory.createApp()` per router; wrap each handler with `handleAppRequest(fn)`.
- **App class**: all handlers receive `App` (not raw Hono `Context`). Use `app.t()`, `app.render()`, `app.requireParam()`, `app.failure()`, `app.notFound()`, `app.isPartial`.
- **HTMX**: default swap is `outerHTML`. Errors rendered via `hx-swap-oob="true"` into `#error-container` element. **Partial vs initial render gotcha**: any UI element rendered by an HTMX partial must also be present in the initial template — tests loading the page fresh (e.g. `/edit/:id`) hit the initial render, not the partial. Keep both in sync.
- **Locale**: set via `?lang=en|de` → cookie → `Accept-Language` fallback. LanguageMiddleware sets `c.set('locale', ...)`.
- **Validation**: Valibot schemas → `mapValidationToErrors()` for UI.
- **Error handling**: throw `AppError | StateError` in handlers; caught by `onError` in `src/index.ts`.
- **Sessions**: `SessionStore` seam (`src/lib/session-store.ts`) with `MemorySessionStore` (tests) and `SqliteSessionStore` (dev/prod). Access via `app.store.get()` / `app.store.save()`. Upgrade path: Turso/SQLite (ADR-0014).
- **Join routes**: `/join/:id/:team?token=<invitationPassword>`. Guards in `src/routes/join/join-utils.ts`: `requireTeam`, `requireSessionAndToken`.
- **Player identity**: per-postponement per-team in `localStorage` key `postpony-player-<sessionId>-<team>`, no cookies/auth. ADR-0013.

## Linting

- ESLint flat config (`eslint.config.js`) — type-aware via `projectService`. All rules at `error` severity (no `warn` level).
- `strictTypeChecked` + `stylisticTypeChecked` on `.ts` files. JS files use `disableTypeChecked`.
- Root `*.config.ts` files in `allowDefaultProject`.
- `**/*.spec.ts` relaxes `no-unsafe-*` and `no-explicit-any`.
- Unused identifiers prefixed `_`.
- `explicit-function-return-type` enforced (except IIFEs and const arrow assertions).
- `function` declarations preferred; lambdas only as parameters.

## Testing gotchas

- **Page Objects**: e2e tests use Page Object classes from `e2e-tests/pages/`. Instantiate manually in each test: `const editPage = new EditPage(page);`. All selectors live inside page objects — tests call methods like `editPage.addProposedDate('2026-03-05T20:00')` or access locators like `editPage.status`. Cross-page workflows use `EditPage.createSession(page, name, dates?)` (replaces the old `createSession` helper).
- **beer.css hides native radios/checkboxes** — toggle via label text, not `.check()` on the role.
- **Heading ambiguity**: layout has `<h1>` brand + page `<h2>`s. Use `getByRole('heading', { name, level: 2 })`. Note: edit page uses the layout `<h1>` only (no duplicate `<h2>`), so its tests use `level: 1`.
- **`<section>` must have a heading**: each `<section>` needs a heading (`<h1>`–`<h6>`) as first child. Layout wrappers use `<div>`. Don't nest `<section>` inside `<section>` unless the inner one is a true subsection.
- **e2e type-checking**: `tsconfig.e2e.json` adds DOM lib; `npm run lint` validates e2e separately.
- **Fixture builders**: `aSession()`, `aPlayer()`, etc. from `src/lib/__test-utils__/builders.ts`. Use deep-partial overrides. Inject via `await app.store.save(session)`.
- **Builder drift**: `builders.spec.ts` asserts every required field — a model change must update builders in lockstep.
- **Unit test mock Hono**: test files create a minimal context object and pass it to `App.create()`. See `edit-handlers.spec.ts` and `app-handler.spec.ts` for the pattern.

## Skills (`.agents/skills/`)

Loadable via the `skill` tool: `route-handlers`, `testing`, `localization`, `css-styling`, `hono`, `htmx`, `npm-scripts`, `accessibility-a11y`, `tool-installation`, `update-test-fixtures`.

## Security model

Dual-password: owner password (edit access) + invitation password (join access, passed as `?token=`). No traditional login. See ADR-0002.

## Agent skills

### Issue tracker

Issues live as markdown files under `.scratch/<feature>/` in this repo. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles, each label equal to its name. See `docs/agents/triage-labels.md`.

### CSS & Design system

Single-file, self-documenting: `design-tokens.css` at `src/public/assets/css/`. See the `css-styling` skill for the full token catalog and conventions.

### Domain docs

Single-context: `CONTEXT.md` at the repo root plus ADRs in `docs/adr/`. See `docs/agents/domain.md`.
