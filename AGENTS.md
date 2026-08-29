# PostPony — Agent Guidelines

A web app for postponing sports matches. SSR (Hono + JSX + HTMX), no SPA framework.

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
* Whe implementing issues: use subagents and commit after each issues

## Quick reference

| Command            | What it does                                                                       |
|--------------------|------------------------------------------------------------------------------------|
| `npm run dev`      | Dev server with fixtures on port 3000                                              |
| `npm run dev:live` | Dev server against live click-tt.ch                                                |
| `npm run test`     | Vitest (coverage on, `@/` → `src/`)                                                |
| `npm run lint`     | `tsc --noEmit` → `tsc -p tsconfig.e2e.json --noEmit` → `eslint . --max-warnings 0` |
| `npm run e2e`      | Playwright (starts its own server on `$E2E_APP_PORT`, default 3001)                |
| `npm run verify`   | lint → test → build → e2e (full CI gate)                                           |

Full script catalog, watch loops, and gotchas: the `npm-scripts` skill.

## Local configuration

For local development, copy `.env-template` to `.env` (git-ignored) and adjust the values there. `src/config.ts` loads `.env` from the repo root at startup via native `process.loadEnvFile`; already-set env vars (shell/npm scripts) take precedence.

The e2e test server port is `E2E_APP_PORT` (default 3001); `playwright.config.ts` loads `.env` itself, so an exported shell value wins (e.g. `E2E_APP_PORT=3007 npm run e2e`). Parallel worktrees: see the `setup-worktree` skill.

## HTTPS & certificates

The app terminates its own TLS by default (`APP_TLS_ENABLED=true`). Certs live at `developer-local-settings/conf/certs/<hostname>.pem` / `.key`. Generate them: `scripts/create-certs.sh` (requires `mkcert` from mise). URL: `https://game-scheduler.localhost:3000`. Set `APP_TLS_ENABLED=false` to serve plain HTTP (no certs needed) when running behind Cloudflare's edge TLS or any reverse proxy.

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
  routes/             — per-feature routers (create/, edit/, join/) with *-get.ts / *-post.ts handlers and .tsx JSX components
  lib/
    postponement.ts   — domain module: pure operations on Postponement, overridable newId()/now() seam
    models.ts         — Postponement, Player, ProposedDate, Vote interfaces
    errors.ts         — AppError (400), StateError (404), InternalError (500), ClickTTError
    temporal-utils.ts — locale-aware date parsing/formatting (parseLocaleDateTime, formatIsoToLocaleTokens); note Temporal's object form *balances* invalid dates, so validation goes through a strict ISO string
    __test-utils__/builders.ts — deep-partial fixture builders (aSession, aPlayer, aProposedDate, aVote)
  locales/            — config.ts (AppLocale = de-CH|fr-CH|it-CH|en-US single source of truth), constants.ts, en.json, de.json; TranslationKeys derived from en.json keys
  public/assets/
    css/design-tokens.css — design tokens in @layer design
    vendor/           — BeerCSS (Material 3) in @layer vendor
e2e-tests/
  pages/              — Page Object Model classes (StartPage, CreatePage, EditPage, JoinPage, ScrapePage)
  fixtures.ts         — Custom Playwright fixtures (checkA11y, makeAxeBuilder)
docs/adr/             — 19 ADRs
```

## Framework patterns

- **Handlers**: `factory.createApp()` per router; wrap each handler with `handleAppRequest(fn)`.
- **App class**: all handlers receive `App` (not raw Hono `Context`). Use `app.t()`, `app.render()`, `app.requireParam()`, `app.failure()`, `app.notFound()`, `app.isPartial`.
- **HTMX**: default swap is `outerHTML`; errors render via `hx-swap-oob="true"` into `#error-container`. **Partial vs initial render**: any UI element an HTMX partial renders must also exist in the initial template (tests hit the initial render, not the partial). See the `route-handlers` skill.
- **Rendering**: `app.render(component)` takes a `JSX.Element` (not a template name). Components are `.tsx` functions with typed `interface` props. Use `pageLayout(view, content, title?)` from `src/routes/layouts/main.tsx` to branch on `view.isPartial` for full-page vs fragment rendering. Translation function (`t`) and `locale` are passed as props (see `ViewContext` in `src/app.ts`). See [ADR 0019](docs/adr/0019-jsx-templates.md).
- **Locale**: `AppLocale = 'de-CH' | 'fr-CH' | 'it-CH' | 'en-US'` (default `de-CH`), resolved by `languageMiddleware` from `?lang=` → `lang` cookie → `Accept-Language` prefix mapping. fr-CH/it-CH reuse the English UI text (ADR-0016). Input formats and resolution order: see the `localization` skill.
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

## Testing

Unit and e2e conventions live in the `testing` skill: Page Objects and `createSession`, beer.css radio/checkbox toggling, heading levels, fixture builders, `toMatchObject` vs `toEqual`, a11y via `checkA11y`, screenshot baselines. Facts not covered there:

- **Two Vitest projects** run under one `vitest run`: `unit` (node environment, TypeScript specs) and `browser` (headless Chromium, client-side JS specs). No separate npm script.
- **`<section>` must have a heading** (`<h1>`–`<h6>`) as first child; layout wrappers use `<div>`. Don't nest `<section>` inside `<section>` unless the inner one is a true subsection.

## Security model

Dual-password: owner password (edit access) + invitation password (join access, passed as `?token=`). No traditional login. See ADR-0002.

## Skills tooling

Third-party skills in `.agents/skills/` are installed with the `skills.sh` CLI (`npx skills`) and pinned in the committed `skills-lock.json`; project-authored skills there are not in the lock.

## Agent skills

### Issue tracker

Issues live as markdown files under `.scratch/<feature>/` in this repo. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles, each label equal to its name. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` at the repo root plus ADRs in `docs/adr/`. See `docs/agents/domain.md`.
