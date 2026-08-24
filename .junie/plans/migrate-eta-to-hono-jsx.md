---
sessionId: session-260824-011736-1ta6
---

# Requirements

### Goal & Outcome
Replace Eta with `hono/jsx` as PostPony's server-side rendering layer and delete the Cloudflare Workers compatibility scaffolding that existed solely for Eta's filesystem assumption. The result is a type-checked render boundary with zero new dependencies, no codegen build step, no committed template artifacts, and behaviorally identical HTML.

### Scope

- **In Scope:**
    - Configure automatic JSX transform (`hono/jsx`) in `tsconfig.json`, `eslint.config.js`, and `vitest.config.ts`.
    - Introduce typed synchronous render seam and ambient `ViewContext` on `App` while preserving the Eta path during migration.
    - Convert all 18 `.eta` templates to `.tsx` components in `src/routes/` (layouts, shared partials, create/scrape, edit/OOB partials, join/vote).
    - Update route handlers and unit tests to pass typed props and assert on rendered HTML.
    - Contract step: delete Eta dependency, codegen script, generated artifact, dual loader, and `template-source` config/worker wiring.
    - Record ADR-0019 (superseding ADR-0008) and update `AGENTS.md`, `CONTEXT.md`, and the `route-handlers` skill.
- **Out of Scope:**
    - Build-time static JSX generators (e.g. NakedJSX) — PostPony renders dynamic per-request HTML.
    - JSX context providers or streaming (`renderToReadableStream`) — props remain explicit and responses remain buffered strings.
    - Changes to routes, URLs, CSS classes, HTMX attributes, validation rules, session store, or security model.
    - Client-side JSX, SPA frameworks, or hydration.

### Done When

- All 18 `.eta` files and Eta compatibility scaffolding (loader, codegen, generated artifact, config knob) are removed.
- All routes render identical semantic HTML from typed `.tsx` components with compile-time checked props.
- Unmodified e2e Playwright suite passes with green accessibility checks.
- Test coverage remains ≥80% across all metrics with `.tsx` files in scope.
- `npm run verify` and `npm run worker:build` pass with zero view-layer `node:fs` references in the worker bundle.

# Technical Design

### Decisions

- **chose `hono/jsx` / not NakedJSX or external engine:** `hono/jsx` is already bundled inside the existing `hono` package, avoiding new dependencies. NakedJSX is a build-time static generator unsuitable for per-request dynamic rendering.
- **chose Expand–Contract sequencing / not Big-Bang:** Step 1 preserves the legacy string Eta render path while adding the JSX seam and converting initial shared views. Each migration step maintains a fully passing test suite (`npm run verify`) rather than breaking the build mid-migration.
- **chose Explicit Props / not JSX Context Providers:** View context (`t`, `locale`, `isPartial`, `baseUrl`, `inputFormat`, `languageOptions`) is exposed via `app.view` and passed as explicit props, keeping unit tests simple without context provider wrappers.
- **chose Synchronous Render Seam / not Async JSX:** `App.render` restricts the input parameter to `HtmlEscapedString` (the non-promise arm of `JSX.Element`). Accidental `async` views fail compilation rather than stringifying promises into output.
- **chose Explicit Layout vs Partial Components / not Runtime Branching in Layout:** `Layout` and `PartialLayout` are distinct components selected at call sites or via a helper function, making partial and cold initial renders share component code while keeping response structure explicit.

### Approach & Touches

- **Toolchain:** `tsconfig.json` (JSX transform to `hono/jsx`), `eslint.config.js` (`.tsx` type-checked rules and spec relaxations), `vitest.config.ts` (`.tsx` test and coverage inclusion), `vite.config.ts` (remove `eta` external).
- **Seam & Core:** `src/app.ts` (`ViewContext` interface, `app.view` getter, overloaded `render`), `src/build-app.ts` (`onError` handler).
- **Views & Partials:**
    - Layout & Shared: `src/routes/layouts/main.tsx`, `src/routes/partials/error-container.tsx`, `src/routes/partials/vote-tally.tsx`, `src/routes/partials/vote-player-results.tsx`, `src/routes/index.tsx`, `src/routes/error.tsx`.
    - Create & Scrape: `src/routes/create/create.tsx`, `src/routes/create/scrape/{leagues,groups,teams,matches}.tsx`.
    - Edit & OOB Partials: `src/routes/edit/id/{edit,proposed-dates-section,team-section,own-team-votes}.tsx`.
    - Join & Vote: `src/routes/join/{join,vote,confirmed-info}.tsx`.
- **Scaffolding Deletions:** `src/lib/templates.ts`, `src/lib/generated/eta-templates.ts`, `scripts/build-eta-templates.ts`, `src/lib/templates.spec.ts`, `src/lib/templates-disk.spec.ts`.
- **Config & Build:** `package.json` (remove `eta` and `build:templates`), `src/config.ts` (remove `template-source`), `wrangler.toml` and `worker.ts` (remove `APP_TEMPLATE_SOURCE`).
- **Docs & Skills:** `docs/adr/0019-jsx-templating-hono-jsx.md`, `docs/adr/0008-templating-engine-selection.md`, `AGENTS.md`, `CONTEXT.md`, `.agents/skills/route-handlers/SKILL.md`.

### Nuances, Risks & Corner Cases

- **Whitespace Sensitivity:** BeerCSS and AirDatepicker structures can be sensitive to whitespace; template markup must be converted verbatim into JSX elements.
- **Attribute Conversions:** Boolean attributes become boolean expressions (`checked={bool}`); conditional attributes use `attr={cond ? value : undefined}` instead of string concatenation.
- **Dynamic Heading Tags:** Convert `<h<%= it.headingLevel %>>` to tag variable pattern: `const H = \`h${headingLevel}\` as const; <H>...</H>`.
- **Partial vs Initial Parity:** OOB companion elements (`#status-chip`, `#vote-tally-section`, own-team votes) must be rendered as sibling components of their respective sections so partial swaps and cold page loads produce identical DOM.
- **Coverage Maintenance:** View branches in `.tsx` count towards the ≥80% coverage requirement. Focused component specs for branch-heavy components (`vote-tally.tsx`, `proposed-dates-section.tsx`) ensure threshold compliance.

# Testing

- **Unmodified E2E Suite (`e2e-tests/`):** Full Playwright suite and `checkA11y` axe fixtures serve as the primary regression oracle to prove zero behavioral or visual HTML drift across all flows.
- **Render Seam Spec (`src/app-render.spec.tsx`):** Verifies synchronous string output, ambient `ViewContext` propagation, and automatic escaping of user-provided content.
- **Component Unit Specs:**
    - `src/routes/partials/vote-tally.spec.tsx`: asserts heading-level variants, empty-list collapse, and correct tally counts.
    - `src/routes/edit/id/proposed-dates-section.spec.tsx`: asserts confirmed vs open status rendering, opponent-votable toggles, and OOB companion presence.
- **Handler Specs Rewired to HTML:** `create-get.spec.ts`, `create-post.spec.ts`, `edit-handlers.spec.ts`, `join-handlers.spec.ts`, `vote-view.spec.ts`, and `build-app.spec.ts` assert on returned HTML strings instead of template names/arguments.
- **Config & Worker Validation:** `config.spec.ts` updated for removed keys, and `npm run worker:build` confirms clean compilation without filesystem imports.

# Assumptions & Open Questions

- **Migration Sequencing Reconciled:** The issue tickets specify an expand–contract migration path (keeping Eta functional in Step 1 while adding JSX seam and converting initial views, then contracting in Step 5), whereas the earlier plan proposed a big-bang replacement. The issue-ticket sequencing is adopted so that every step yields an independently testable, green state via `npm run verify`.

# Delivery Steps

###   * Step 1: Set up JSX toolchain, typed render seam, layout, and shared views
Goal: Configure Hono JSX compilation, establish the typed `App.render` seam and ambient `ViewContext` while preserving the Eta render path, and convert layout, shared partials, start page, and error page to JSX. Scope: `tsconfig.json`, `eslint.config.js`, `vitest.config.ts`, `src/app.ts`, `src/build-app.ts`, `src/routes/index-get.ts`, `src/routes/layouts/`, `src/routes/partials/`, `src/routes/index.tsx`, `src/routes/error.tsx`, `src/app-render.spec.tsx`, `src/routes/partials/vote-tally.spec.tsx`. Acceptance Criteria:

- [ ] `tsconfig.json` configures `"jsx": "react-jsx"` and `"jsxImportSource": "hono/jsx"`.
- [ ] `eslint.config.js` and `vitest.config.ts` include `.tsx` files in type-checking, linting, test discovery, and coverage.
- [ ] `App` exposes `app.view` returning `ViewContext` and an overloaded/updated `render` method supporting typed synchronous `HtmlEscapedString` rendering while retaining legacy Eta support for unconverted callers.
- [ ] `layouts/main.tsx` provides `Layout` and `PartialLayout` components with an explicit page helper.
- [ ] Shared components `error-container.tsx`, `vote-tally.tsx` (using tag variables for heading levels), `vote-player-results.tsx`, `index.tsx`, and `error.tsx` are implemented and rewired in `index-get.ts` and `build-app.ts` (`onError`).
- [ ] `src/app-render.spec.tsx` and `src/routes/partials/vote-tally.spec.tsx` pass.
- [ ] `npm run verify` passes with existing unconverted routes continuing to function. Verification: `npm run verify` → green

### Step 2: Convert create form and scrape wizard views to JSX
Goal: Migrate the create postponement form (create and change modes) and the 4-step scrape wizard to typed `.tsx` components and rewire handlers. Scope: `src/routes/create/create.tsx`, `src/routes/create/scrape/{leagues,groups,teams,matches}.tsx`, `src/routes/create/create-get.ts`, `src/routes/create/create-post.ts`, `src/routes/create/scrape/*-get.ts`, `src/routes/create/create-get.spec.ts`, `src/routes/create/create-post.spec.ts`. Acceptance Criteria:

- [ ] `create.tsx` renders create and change modes with typed props and proper `aria-invalid` / `aria-describedby` error wiring on validation failure.
- [ ] `leagues.tsx`, `groups.tsx`, `teams.tsx`, and `matches.tsx` render scrape wizard steps using scraper result types as props.
- [ ] Handlers in `src/routes/create/` pass typed props plus `app.view` to `app.render()`.
- [ ] `create-get.spec.ts` and `create-post.spec.ts` assert on rendered HTML output.
- [ ] `npm run verify` passes with unmodified E2E tests for create and scrape flows. Verification: `npm run verify` → green

### Step 3: Convert edit page and out-of-band partials to JSX
Goal: Migrate the edit page, its sub-sections (proposed dates, team, own-team votes), and out-of-band companion partials to typed `.tsx` components. Scope: `src/routes/edit/id/{edit,proposed-dates-section,team-section,own-team-votes}.tsx`, `src/routes/edit/id/render-edit-partials.ts`, `src/routes/edit/id/edit-id-get.ts`, `src/routes/edit/id/players-post.ts`, `src/routes/edit/id/proposed-dates-section.spec.tsx`, `src/routes/edit/id/edit-handlers.spec.ts`. Acceptance Criteria:

- [ ] `edit.tsx`, `proposed-dates-section.tsx`, `team-section.tsx`, and `own-team-votes.tsx` render with props extending view-model builders (`EditPartialsData`, `ProposedDateTallyItem`, `OwnTeamView`).
- [ ] Out-of-band companions (`#status-chip`, `#vote-tally-section`, own-team votes) are rendered as sibling components sharing the same component source between initial cold load and partial swaps.
- [ ] Confirmed status hides date addition and offers reopen; reopen chip appears when `reopenCount > 0`; empty date/player lists collapse.
- [ ] `proposed-dates-section.spec.tsx` verifies confirmed vs open status, toggle states, and OOB companions.
- [ ] `edit-handlers.spec.ts` assertions are updated to verify returned HTML.
- [ ] `npm run verify` passes with unmodified E2E edit flow tests. Verification: `npm run verify` → green

### Step 4: Convert join and vote views to JSX
Goal: Migrate the join, voting, and confirmed-info views to typed `.tsx` components and rewire join/vote handlers. Scope: `src/routes/join/{join,vote,confirmed-info}.tsx`, `src/routes/join/join-get.ts`, `src/routes/join/join-register-post.ts`, `src/routes/join/vote-view.ts`, `src/routes/join/join-handlers.spec.ts`, `src/routes/join/vote-view.spec.ts`. Acceptance Criteria:

- [ ] `join.tsx`, `vote.tsx`, and `confirmed-info.tsx` are implemented as typed components reusing vote view-model shapes.
- [ ] `join-get.ts`, `join-register-post.ts`, and `vote-view.ts` invoke `app.render()` with typed components and `app.view`.
- [ ] Access control, team guards, and token guards remain intact; vote registration and per-team tally counts render accurately across all 4 locales.
- [ ] `join-handlers.spec.ts` and `vote-view.spec.ts` assert on rendered HTML output.
- [ ] `npm run verify` passes with unmodified E2E join and voting tests. Verification: `npm run verify` → green

### Step 5: Contract — remove Eta and Workers compatibility scaffolding
Goal: Remove all remaining `.eta` templates, Eta dual loader, codegen script, generated artifact, `template-source` config, and Eta dependency. Scope: `package.json`, `vite.config.ts`, `src/app.ts`, `src/config.ts`, `src/config.spec.ts`, `wrangler.toml`, `worker.ts`, `scripts/build-eta-templates.ts`, `src/lib/templates.ts`, `src/lib/generated/eta-templates.ts`, `src/lib/templates.spec.ts`, `src/lib/templates-disk.spec.ts`, `src/routes/**/*.eta`. Acceptance Criteria:

- [ ] All 18 `.eta` files are deleted from `src/routes/`.
- [ ] `src/lib/templates.ts`, `src/lib/generated/eta-templates.ts`, `scripts/build-eta-templates.ts`, `src/lib/templates.spec.ts`, and `src/lib/templates-disk.spec.ts` are deleted.
- [ ] `App.render` removes the legacy string template branch and accepts only `HtmlEscapedString`.
- [ ] `eta` is removed from `dependencies` in `package.json` and external rollup options in `vite.config.ts`; `build:templates` script is removed and `build` becomes `vite build`.
- [ ] `template-source` key is removed from `src/config.ts`, `src/config.spec.ts`, `wrangler.toml`, and `worker.ts`.
- [ ] `scripts/build-eta-templates.ts` is removed from `eslint.config.js` `allowDefaultProject`.
- [ ] `npm run verify` passes, coverage is ≥80% on all metrics, and `npm run worker:build` produces a worker bundle with zero `node:fs` references. Verification: `npm run verify && npm run worker:build` → green

### Step 6: Record ADR-0019 and update agent documentation
Goal: Document the JSX SSR architectural decision, supersede ADR-0008, and update all agent guidance docs and skills. Scope: `docs/adr/0019-jsx-templating-hono-jsx.md`, `docs/adr/0008-templating-engine-selection.md`, `AGENTS.md`, `CONTEXT.md`, `.agents/skills/route-handlers/SKILL.md`. Acceptance Criteria:

- [ ] `docs/adr/0019-jsx-templating-hono-jsx.md` is created, detailing context, `hono/jsx` decision, typed props benefits, and rejected alternatives (e.g. NakedJSX).
- [ ] `docs/adr/0008-templating-engine-selection.md` is updated as superseded by ADR-0019 with bidirectional links.
- [ ] `AGENTS.md` is updated (project structure tree shows `.tsx` views and no generated templates; framework patterns show `app.render(<Component />)` and explicit layout usage; command table removes `build:templates`).
- [ ] `CONTEXT.md` and `.agents/skills/route-handlers/SKILL.md` remove references to Eta templates and `template-source`.
- [ ] `npm run verify` passes with docs fully updated. Verification: `npm run verify` → green
