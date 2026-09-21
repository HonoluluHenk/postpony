# 8. Crosscutting Concepts

## 8.1 Error handling

Typed hierarchy `AppError(400) → InternalError(500) / StateError(404) / ClickTTError` (`src/lib/errors.ts`). Handlers throw via `App.failure/notFound/internal`. One central `onError` maps to HTTP status and renders a full page or an out-of-band partial into `#error-container`. Client `ui.js` skips swapping bodies that already carry `hx-swap-oob`. Degradation policy: scrape failures never block persistence. Transient scrape failures are handled before `onError`: `transientScrapeErrorKey` (`src/lib/scrape-errors.ts`) classifies `ClickTTError` (upstream) and `TypeError` (unreachable) as retryable; the scrape handlers then re-render the step as `ScrapeStepError`, and a failed schedule check during an edit mutation persists the dates and sets `clashDataStale` for a retryable rail notice. Non-transient errors rethrow to `onError`.

## 8.2 Validation

Valibot schemas at every trust boundary (`MatchSchema`, `PlayerSchema`, `buildSingleDateSchema`, `buildTupleSchema`, `venueNumberSchema`, `dateOnlyFieldSchema`). `mapValidationToErrors` → `{fields, global}` → per-field UI errors in 400 partials. Server-side guards beyond schema: weekday derived from row index (never trusted from client, ADR-0021), `MAX_TUPLES` cap, venue range cap, vote value whitelist, votable-date whitelist in `applyVotes`. Domain date validation goes through strict ISO round-trips because Temporal's object form balances invalid dates.

## 8.3 Internationalisation

`AppLocale = de-CH | fr-CH | it-CH | en-US` (default `de-CH`); fr-CH/it-CH reuse English text (ADR-0016). Translations are JSON with `<%= it.x %>` placeholders; `TranslationKeys` are derived from `en.json` keys. `t`, `locale`, `inputFormat`, `languageOptions` flow as props via `ViewContext`. Locale drives the input grammar and date/time formatting (per-locale `dateFormat`/`timeFormat`/`clock24`/`dayFirst`). A language `<select>` in the header writes `localStorage.lang` and reloads with `?lang=`.

## 8.4 Persistence / Session store seam

`SessionStore` interface (`migrate`/`get`/`save`) with `MemorySessionStore` (tests) and `SqliteSessionStore` (dev/prod). Injected once into Hono context in `buildApp`. Whole `Postponement` as JSON in `sessions(id, club_id, data)`. The libSQL client is chosen lazily by URL scheme (non-literal import) to keep the node client out of the Worker bundle.

## 8.5 HTMX / partial rendering

Default swap `outerHTML`; `hx-boost="true"` on the container, disabled per-element for the join register form and `.ics` links. Partial detection = `HX-Request` header. Edit mutations and the edit sort radio re-render the `#edit-grid` fragment (rail + sidebar stay in sync); opponent mutations and the opponent sort radio re-render the `#opponent-view` fragment. Both date lists share one sort control (`src/routes/partials/sort-control.tsx`): grouping by ISO week (`?sort=date`) or into the four Match-Format availability bands scoped to the viewing team (`?sort=availability`, via `groupByAvailabilityBands`; the domain ranking and labels are ADR-0027), each with its OOB error/status; both render the full page when not HTMX, and the fragment root matches the swap target so swaps never nest. The join vote page reuses the same ISO-week grouping (week headings with the week's venue chip hoisted into the heading) for its date list. `?sort` is recovered from `HX-Current-URL` for mutations, and
the sort radios are re-synced from the URL by `ui.js` after a reload (`load`/`pageshow`) or an HTMX history restore, because Firefox's
form-state restore can clear the server-rendered selection. Vote saves are AJAX too: the vote form
carries `hx-post` and swaps the `#vote-region` fragment (saved-toast + form + tally) in place, rendered standalone for an HTMX request and inside the full page otherwise; `ui.js` restores focus to the changed control after the swap. Without JavaScript the same form posts natively (`method="post"` + a `<noscript>` submit control), so the auto-save and the fallback POST can never double-fire. A vote
save that races confirmation gets `HX-Refresh`. Out-of-band targets: `#error-container`, `#clipboard-status`/status announcement, `#status-chip`. Rule: any element a partial renders must also exist in the initial render.

## 8.6 Security

- **Four secrets** (ADR-0025): organizer-captain (full edit, verified on edit GET/POST), opponent-captain (scoped to the side opposite `organizerTeam`), home-player and away-player (per-team vote access, carried as `?token=`). Hashing is PBKDF2-SHA256, 100 000 iterations, 16-byte salt, 64-byte hash, constant-time compare; ids via `crypto.randomUUID()`.
- **Shareable plaintexts persisted.** The three shareable secrets — opponent-captain, home-player, away-player — are stored **plaintext** on the `Postponement` alongside their hashes, because the views render share links (own-team link via `edit.tsx`, opponent-team link via `opponent.tsx`). The organizer-captain plaintext is shown once and never persisted.
- **Verification at the trust boundary.** `comparePassword` verifies the organizer-captain password on every edit GET/POST (`edit-auth.ts`), the opponent-captain password on `/opponent/:id` (`opponent-utils.ts`), and the per-team player password on every join route (`join-utils.ts`).
- Team param whitelisted to `home|away`; the join token is checked against the matching team's player hash (a team/token mismatch is a 403). `readPendingVotes` echoes only structurally-valid ids/values. Assets guard blocks serving co-located `*.spec.*` client tests.

## 8.7 Accessibility

WCAG 2.2 AA (ADR-0004). Concretely: skip link to `#main-content`, one `<h1>` with a visible-text accessible name, language nav with `aria-label`, `role="alert"` error container, visually-hidden `role="status"` announcements, `aria-live="polite"` spinner, decorative icons `aria-hidden`, `aria-invalid`/`aria-describedby` on invalid fields, `<fieldset>/<legend>` radio groups, the date/venue chips exposing their full venue name as visually-hidden text (`VenueChip`), vote-choice tooltips (`role="tooltip"` + `aria-describedby`, shown on hover and `:focus-within`/`:focus-visible`), focus management in `ui.js`. Interactive vote and sort controls meet WCAG 2.5.8 (target size): the wrapped labels (`.vote-radio-group .radio`, `.sort-option`, `.action--votable`) carry an explicit 24×24 CSS px floor. Edit-rail controls compose their accessible name from the control and the row's date through one shared helper (`controlNameWithDate` in `src/routes/partials/control-with-date.ts`), so a screen reader
hears e.g. "Delete · Tu, Sep 1, 2026, 8:00 PM" rather than a bare control name. Enforced by axe (`checkA11y`, tags `wcag2a/2aa/21a/21aa/22a/22aa`) and dedicated e2e suites (`semantic-structure`, `focus-management`, `responsive`).

## 8.8 Observability

`AppLogger` façade; console logger always, upgraded to pino on Node only (non-literal import). Structured `{status, path, message}` warn/error in `onError`. Cloudflare observability enabled (`head_sampling_rate: 1`). Reduced observability on Workers (console only) is a known trade-off.

## 8.9 Testing architecture

Two Vitest projects under one `vitest run`: `unit` (node, `src/**/*.spec.{ts,tsx}`) and `browser` (headless Chromium, `src/public/assets/js/*.spec.js`) — ADR-0020. Coverage via v8 over `src/**` including client JS. Playwright e2e runs its own server in fixture mode (`https://game-scheduler.localhost:<E2E_APP_PORT>`), with `ignoreHTTPSErrors`, 2 % screenshot tolerance, and Page Objects in `e2e-tests/pages/`.

## 8.10 Crawling & indexing policy

Only the start page (`/`) may be crawled or indexed; every other route is off-limits. Single source of truth is `src/lib/crawl-policy.ts`: the policy files, the bot detection, and the allowed-path classifier all derive from it, so the advisory text and the enforcement cannot drift.

- **Policy files.** `GET /robots.txt` (RFC 9309): catch-all `User-agent: *` plus explicit AI crawler stanzas (`GPTBot`, `ClaudeBot`, `PerplexityBot`, `Google-Extended`, `CCBot`, …), each `Disallow`-ing `/create`, `/edit`, `/join`, `/opponent`, `/assets`. `GET /ai.txt` mirrors the AI stanzas (draft convention, not yet a formal standard).
- **Request filter.** A `buildApp` middleware 403s any request whose user-agent matches a known robot/AI token (`bot`, `crawler`, `spider`, `scraper`, plus the explicit crawler names) on any non-allowed path. The start page, the policy files, and `/assets/*` are always whitelisted; `robots.txt`/`ai.txt` must stay reachable so compliant crawlers can read the rules.
- **Indexing belt.** Non-allowed paths get an `X-Robots-Tag: noindex` response header, because robots.txt blocks crawling, not indexing: a disallowed URL linked from elsewhere can still be indexed (with a title-only entry). `POST`/HTMX fragments inherit it harmlessly.

## 8.11 UI theme & typography

One self-hosted type family app-wide: the design-layer `:root` overrides BeerCSS's `--font` with `'IBM Plex Sans'` first and the vendor Inter/Roboto stack as an exhausted fallback (`--font-sans` aliases `--font`); the condensed Plex face stays scoped to the edit rail's date cells. The same `:root` declares `color-scheme: light` so native scrollbars, selects, and date-picker dialogs stay light on dark-mode OSes (no dark palette exists). Count columns and count labels (`.num`, `.team-tally`, `.vote-dot-count`) share the `font-variant-numeric: tabular-nums` + `text-align: end` convention so compared numbers stop jittering as values change. The `theme-color` meta renders without content and `ui.js`'s `initThemeColor` fills it from the `--theme-color` token (`= --surface`), keeping the surface hex in the token files as the single source.

## 8.12 Collapsible availability bands

Under the availability sort, a band whose row count exceeds 6 (`BAND_COLLAPSE_THRESHOLD` in `src/routes/partials/sort-control.tsx`) renders behind a native `<details>` disclosure whose `<summary>` is the band heading (label + count), so a wall of repeated tallies never buries the stronger bands. The full-strength band opens by default; every other band renders closed. The default is purely deterministic (threshold + band kind, never user memory), so each re-render after an HTMX fragment swap lands on the same default and can never strand the rail in a collapsed/expanded mismatch. The week-grouped date sort never collapses.

Accessibility is native: `<summary>` is a keyboard-operable disclosure toggle, BeerCSS's outline reset is countered with a `:focus-visible` ring, the hidden marker is replaced with a CSS chevron that rotates under `prefers-reduced-motion` it keeps its rotation but loses its transition, and axe runs over the expanded rail.

## 8.13 Sticky vote action bar

On the join vote page the "Set all" fieldset is `position: sticky` (`.vote-set-all`) within the vote region, so a Participant re-bulks without scrolling back up a long date list; on a list too short to scroll it stays in place in-flow. Under `prefers-reduced-motion: reduce` it degrades to `position: static` so nothing repositions while scrolling. This depends on a global fix: BeerCSS gives `main.responsive` `overflow-x: hidden`, which silently makes it a scroll container and breaks `position: sticky` for every sticky descendant; the app overrides it to `overflow-x: clip`, which clamps the same horizontal overflow without creating a scroll container and also restores the edit sidebar's sticky behaviour.

## 8.14 Implementation workflow (agent tooling)

The ticket-based development workflow runs on opencode subagents. `app-implement-all` (`.agents/skills/app-implement-all/SKILL.md`) dispatches each frontier ticket in parallel to the `implement` subagent (`.opencode/agent/implement.md`) inside the shared feature worktree, passing the worktree, spec, and ticket paths. The agent loads the `implement` skill (tdd at the pre-agreed seams, regular typechecking and single-file tests, one full-suite run, `/code-review`) and applies the per-step commit convention (`ticket done:` / `review:` / `review-fixed: <NN>-<slug>` plus a `## Comments` line carrying the SHAs), never staging beyond its own ticket's files or using `git add -A` on the shared worktree. The skill and the agent file are the single source of truth; this section only points at them.
