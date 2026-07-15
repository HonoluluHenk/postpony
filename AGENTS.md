# AI Agents Guidelines

This document provides context and guidelines for AI agents working on the PostPony project.

## General instructions

* Ask questions, do not guess
* Ask questions one by one
* Keep answers short and concise, do not babble.
* Keep everything strongly typed (not "stringly").

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
* Mark intentional simplifications with a ponytail: comment. If the shortcut has a known ceiling (global lock, O(n²) scan, naive heuristic), the comment names the ceiling and the upgrade path.

Examples:

- `// ponytail: using local Map for sessions; upgrade to Redis for horizontal scaling.`
- `// ponytail: naive O(n) scan for venue availability; upgrade to interval tree if venue count > 50.`

Not lazy about: input validation at trust boundaries, error handling that prevents data loss, security, accessibility, the calibration real hardware needs (the platform is never the spec ideal, a clock drifts, a sensor reads off), anything explicitly requested. Lazy code without its check is unfinished: non-trivial logic leaves ONE runnable check behind, the smallest thing that fails if the logic breaks (an assert-based demo/self-check or one small test file; no frameworks, no fixtures). Trivial one-liners need no test.

## Project Overview

PostPony is a web-based application for postponing sports matches as quick and easy as the Pony Express. It
calculates optimal times based on venue availability, team/player availability, and holidays.
It also helps users to vote and eventually decide on the best rescheduling options.

## Project Structure

- `src/routes/`: Route handlers (`*-get.ts`, `*-post.ts`) and Eta templates (`*.eta`).
- `src/lib/`: Shared logic, models, middleware, and utilities.
- `src/locales/`: Localization files (`en.json`, `de.json`) and type definitions.
- `docs/ADR/`: Architectural Decision Records (refer to these for context on core decisions).
- `e2e-tests/`: Playwright end-to-end and accessibility tests.

## Core Technical Stack

### Architecture

Multi-tenancy support (future-proofed). See [ADR 0003](docs/ADR/0003-core-tech-stack.md).

### Security

Dual-password system (Owner Password & Invitation Password). See [ADR 0002](docs/ADR/0002-security-model-dual-password.md).

### Standards

WCAG 2.2 AA for accessibility.

### Testing

Playwright for E2E and accessibility testing.

## Core Technologies

### Technology Stack

- Hono (web framework)
- TypeScript
- Valibot (schema validation)
- Eta (template engine)
- Convict (configuration management)
- Temporal polyfill (@js-temporal/polyfill)
- HTML
- Raw CSS without Frameworks
- Beer.css for Material Design
- HTMX with defaultSwapStyle = 'outerHTML', on errors: update the 'errors' element out-of-band
- NX Monorepo
- Playwright with Axe plugin
- Vite
- Vitest
- ESLint (typescript-eslint, flat config, `strictTypeChecked` / type-aware)
- Node.js HTTPS server (@hono/node-server)
- Mise tool manager

### Coding Patterns

- **Hono & HTMX**: Use the `App` class (`src/app.ts`) to wrap the context. Use `app.isPartial` to determine if a full layout or a fragment should be rendered.
- **Localization**: All user-facing strings must use `app.t('key')`. New keys should be added to `src/locales/en.json`, which automatically updates the `TranslationKeys` type.
- **Validation**: Use `Valibot` for schemas. See [ADR 0012](docs/ADR/0012-validation-library-valibot.md). Use `mapValidationToErrors` to format issues for the UI.
- **Error Handling**: Throw `AppError` or `StateError` from `src/lib/errors.ts`; the `handleAppRequest` wrapper in `src/index.ts` handles the UI toast response.
- **In-memory session store**: Sessions live in `App.sessions` (a static in-memory record). This is the current persistence reality — a natural spot for a `ponytail:` upgrade note.
- **Invited-participant routes**: Team role lives in the URL path (`/join/:id/:team?token=<invitationPassword>`), reusing the single invitation token; `team` is validated to the literal `'home' | 'away'`. Shared guards live in `src/routes/join/join-utils.ts` (`requireTeam`, `requireSessionAndToken`). See [ADR 0013](docs/ADR/0013-join-participant-identity.md).
- **Client identity via `localStorage`**: Player identity is stored as `postpony-player-<sessionId>` → `playerId`, deliberately per-postponement (no cookies/auth). It complements, not replaces, the dual-password model. See [ADR 0013](docs/ADR/0013-join-participant-identity.md).

For more details, see:

- [Project Specification](docs/specification.md)
- [Implementation Plan](docs/implementation_plan.md)
- [Architecture Decision Records (ADRs)](docs/ADR)

## Key Entities

- **Reschedule**: The primary entity representing a rescheduling process.
- **Venue**: Management of operating hours and bookings.
- **Team/Player**: Management of availability.

## Code Style

### Naming

1. Entity-Names are singular

### Indentation / Line-Breaks

1. Use 2 characters for indentation by default.
2. Use 4 characters for Markdown files (required by nested lists).
3. For chained method calls:
    * insert newlines before each chained method call (before the '.')

### Line Length

1. Use a maximum of 120 characters per line.
2. In Markdown files, prefer soft-breaks at sentence or word boundaries.

## AI Agent Instructions

* Ask questions for clarification, do not guess!
* Use the IntelliJ MCP if possible.

### Accessibility

* All UI changes must adhere to WCAG 2.2 AA. Use automated checks (e.g., Axe) during testing.
* Use semantic HTML and ARIA attributes for accessibility.
* Prefer a11y selectors (e.g. `getByRole`) in playwright tests.
* Ensure all interactive elements are reachable via keyboard and have proper focus indicators.

### Security

* Respect the dual-password security model. Do not introduce traditional login systems without reviewing [ADR 0002](docs/ADR/0002-security-model-dual-password.md).

### Consistency

* Follow the patterns established in existing ADRs and documentation.

### Localization

* Use framework-level i18n support for all UI text.

### Testing

* Add or update unit-tests for any new features.
* Add or update Playwright tests for any new features or UI changes.
* Use `axe` plugin in Playwright tests to verify WCAG compliance.
* Place test files alongside the respective source files.
* Prefer running Tests via IntelliJ MCP.
* Place everything possible inside a top-level `describe`
* Coverage:
    * is calculated by default on every test run in the [/coverage](/coverage) directory.
    * must be _at least_ 80% (branch, statement, line and functions). More is better.

#### Fixture builders (single source of truth)

* `src/lib/__test-utils__/builders.ts` provides deep-merge partial builders (`aSession`, `aPlayer`,
  `aProposedDate`, `aVote`, `aVenue`).
* New route-handler unit tests should reuse them with partial overrides (e.g. `aPlayer({ teamId: 'away' })`)
  and inject sessions via `app.sessions[session.id] = session` (the pattern used in `edit-handlers.spec.ts`).
* Any model change **must** update the builders in lockstep: `builders.spec.ts` asserts every required field
  is present, so drift breaks compilation across all consumers.

#### Playwright gotchas

* **beer.css visually hides native radios/checkboxes**, so `.check()` on the `radio` role fails. Toggle the
  control via its **label text** instead (scope to the form to avoid matching summary-table headers).
* **Disambiguate headings by level.** The layout renders an `<h1>` brand/logo alongside page `<h2>`s, so
  `getByRole('heading', { name })` hits strict-mode "2 elements" errors. Pass `{ level: 2 }` for page headings.
* **e2e files are type-checked separately.** `npm run lint` runs `tsc --noEmit`,
  `tsc -p tsconfig.e2e.json --noEmit`, then `eslint . --max-warnings 0`, so a lint pass also validates e2e types.

### Browser-Access

* The app start page is at `https://game-scheduler.localhost:3000`

### Quality

* On UI changes: verify changes using available Browser MCPs (first available: Playwright, Firefox, Chrome)
* Run `npm run lint` (which includes `lint:eslint`) before submitting changes.
* ESLint uses the flat config in `eslint.config.js`. Prefix intentionally unused identifiers with `_`.
* The config enables `tseslint.configs.strictTypeChecked` (type-aware linting via `projectService`). JS files use
  `disableTypeChecked`; root `*.config.ts` files are linted via `allowDefaultProject`.
* `**/*.spec.ts` relax the `no-unsafe-*` and `no-explicit-any` rules because they rely on deliberately loosely-typed
  (`any`) mocks.
* Warnings-as-errors is enforced in `eslint.config.js` itself rather than via the CLI `--max-warnings 0` flag
  (ESLint flat config has no `maxWarnings` option): every rule is kept at `error` severity, so there are no
  `warn`-level rules and any violation fails `npm run lint`.
* Use `npm run lint:eslint:fix` to auto-fix where possible.

### Tools

* Use mise-en-place to install tools. Update the lockfile for tools required by the app.

### Code-Style

* Write functions declarations as `function`, use lambdas only as parameter.
* Add newlines between logically related blocks of code.
