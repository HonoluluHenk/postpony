# 8. Crosscutting Concepts

## 8.1 Error handling

Typed hierarchy `AppError(400) → InternalError(500) / StateError(404) / ClickTTError` (`src/lib/errors.ts`). Handlers throw via `App.failure/notFound/internal`. One central `onError` maps to HTTP status and renders a full page or an out-of-band partial into `#error-container`. Client `ui.js` skips swapping bodies that already carry `hx-swap-oob`. Degradation policy: scrape failures never block persistence.

## 8.2 Validation

Valibot schemas at every trust boundary (`MatchSchema`, `PlayerSchema`, `buildSingleDateSchema`, `buildTupleSchema`, `venueNumberSchema`, `dateOnlyFieldSchema`). `mapValidationToErrors` → `{fields, global}` → per-field UI errors in 400 partials. Server-side guards beyond schema: weekday derived from row index (never trusted from client, ADR-0021), `MAX_TUPLES` cap, venue range cap, vote value whitelist, votable-date whitelist in `applyVotes`. Domain date validation goes through strict ISO round-trips because Temporal's object form balances invalid dates.

## 8.3 Internationalisation

`AppLocale = de-CH | fr-CH | it-CH | en-US` (default `de-CH`); fr-CH/it-CH reuse English text (ADR-0016). Translations are JSON with `<%= it.x %>` placeholders; `TranslationKeys` are derived from `en.json` keys. `t`, `locale`, `inputFormat`, `languageOptions` flow as props via `ViewContext`. Locale drives the input grammar and date/time formatting (per-locale `dateFormat`/`timeFormat`/`clock24`/`dayFirst`). A language `<select>` in the header writes `localStorage.lang` and reloads with `?lang=`.

## 8.4 Persistence / Session store seam

`SessionStore` interface (`migrate`/`get`/`save`) with `MemorySessionStore` (tests) and `SqliteSessionStore` (dev/prod). Injected once into Hono context in `buildApp`. Whole `Postponement` as JSON in `sessions(id, club_id, data)`. The libSQL client is chosen lazily by URL scheme (non-literal import) to keep the node client out of the Worker bundle.

## 8.5 HTMX / partial rendering

Default swap `outerHTML`; `hx-boost="true"` on the container, disabled per-element for join/vote forms and `.ics` links. Partial detection = `HX-Request` header. Edit mutations re-render the whole page as a fragment (rail + sidebar stay in sync); `?sort` is recovered from `HX-Current-URL`. Out-of-band targets: `#error-container`, `#clipboard-status`/status announcement, `#status-chip`. Rule: any element a partial renders must also exist in the initial render.

## 8.6 Security

- **Dual password** (ADR-0002/0011): organizer password (edit) + invitation password (join, `?token=`). Hashing is PBKDF2-SHA256, 100 000 iterations, 16-byte salt, 64-byte hash, constant-time compare; ids via `crypto.randomUUID()`.
- **Invitation password** is stored **plaintext** on the `Postponement` alongside its hash, because the edit page renders share links (`models.ts`, `edit.tsx`).
- **Organizer password** is generated, hashed, and stored, but **never verified** — `comparePassword` has a single call site in the join path (`join-utils.ts`). Edit routes are unauthenticated by URL. See §11 risk #1.
- Team param whitelisted to `home|away`; token checked on every join route (403). `readPendingVotes` echoes only structurally-valid ids/values. Assets guard blocks serving co-located `*.spec.*` client tests.

## 8.7 Accessibility

WCAG 2.2 AA (ADR-0004). Concretely: skip link to `#main-content`, one `<h1>` with a visible-text accessible name, language nav with `aria-label`, `role="alert"` error container, visually-hidden `role="status"` announcements, `aria-live="polite"` spinner, decorative icons `aria-hidden`, `aria-invalid`/`aria-describedby` on invalid fields, `<fieldset>/<legend>` radio groups, focus management in `ui.js`. Enforced by axe (`checkA11y`, tags `wcag2a/2aa/21a/21aa/22a/22aa`) and dedicated e2e suites (`semantic-structure`, `focus-management`, `responsive`).

## 8.8 Observability

`AppLogger` façade; console logger always, upgraded to pino on Node only (non-literal import). Structured `{status, path, message}` warn/error in `onError`. Cloudflare observability enabled (`head_sampling_rate: 1`). Reduced observability on Workers (console only) is a known trade-off.

## 8.9 Testing architecture

Two Vitest projects under one `vitest run`: `unit` (node, `src/**/*.spec.{ts,tsx}`) and `browser` (headless Chromium, `src/public/assets/js/*.spec.js`) — ADR-0020. Coverage via v8 over `src/**` including client JS. Playwright e2e runs its own server in fixture mode (`https://game-scheduler.localhost:<E2E_APP_PORT>`), with `ignoreHTTPSErrors`, 2 % screenshot tolerance, and Page Objects in `e2e-tests/pages/`.
