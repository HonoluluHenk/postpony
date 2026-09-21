---
name: app-npm-scripts
description: Reference for the npm scripts defined in this project's package.json (PostPony). Use when the user (or you) needs to run the dev server, run tests, lint, build, end-to-end (e2e) test or otherwise drive the project lifecycle via npm.
---

# PostPony npm Scripts

This skill documents every script defined in `package.json` so that agents can pick the right command quickly and never invent ad-hoc ones.

## When to Use This Skill

Use this skill whenever you need to:

- Start the dev server or watch loops.
- Run unit tests (Vitest) or end-to-end tests (Playwright).
- Type-check application or e2e code.
- Build or start the production bundle.
- Clean build artifacts.
- Run the full verification pipeline before finishing a change.

## Quick Reference

| Script                    | Command                                       | Purpose                                                                                          |
|---------------------------|-----------------------------------------------|--------------------------------------------------------------------------------------------------|
| `npm run dev`             | `NODE_ENV=development tsx watch src/index.ts` | Start the Hono server in watch mode for local development.                                       |
| `npm run dev:test`        | `vitest`                                      | Run Vitest in interactive watch mode for unit tests.                                             |
| `npm run dev:lint`        | `tsc --noEmit --watch`                        | Continuously type-check `src/` (no JS emitted).                                                  |
| `npm run check:actionlint`| `actionlint`                                  | MANUAL-only lint of `.github/workflows/*.yml` (via `@kjanat/actionlint`). Deliberately outside the `lint:*` wildcard, so `npm run lint`/`verify` never run it. |
| `npm run clean`           | `rimraf dist playwright-report test-results`  | Remove build output and Playwright reports.                                                      |
| `npm start`               | `node dist/index.js`                          | Run the built server (requires `npm run build` first).                                           |
| `npm run lint`            | `run-s -l lint:*`                             | Aggregator: runs every `lint:*` script in sequence (`lint:source` + `lint:e2e` + `lint:eslint`). |
| `npm run lint:source`     | `tsc --noEmit`                                | Type-check application code (`tsconfig.json`).                                                   |
| `npm run lint:e2e`        | `tsc -p tsconfig.e2e.json --noEmit`           | Type-check the Playwright e2e test code (`tsconfig.e2e.json`).                                   |
| `npm run lint:eslint`     | `eslint .`                                    | Run ESLint (flat config `eslint.config.js`); warnings-as-errors is enforced in the config.       |
| `npm run lint:eslint:fix` | `eslint . --fix`                              | Auto-fix ESLint issues where possible (not run by the `lint` aggregator).                        |
| `npm test`                | `vitest run`                                  | Run Vitest once (CI-style, non-watch). Covers `*.spec.ts` files.                                 |
| `npm run build`           | `vite build`                                  | Produce a production bundle in `dist/`.                                                          |
| `npm run e2e`             | `playwright test e2e-tests`                   | Run Playwright tests in `e2e-tests/` (`*.e2e.ts`).                                               |
| `npm run verify`          | `npm-run-all lint test build e2e`             | Full verification pipeline. Run this before submitting any change.                               |
| `npm run release`         | `node scripts/release.mjs`                    | Release bookkeeping for the tag-driven prod deploys: fails on a dirty tree / existing tag / non-`-dev` version, runs `npm run verify`, bumps to the release `X.Y.Z`, commits, annotated `vX.Y.Z` tag, bumps back to `X.Y.0-dev`, prints push commands — never pushes. |
| `npm run playwright:ui`   | `playwright test --ui`                        | Open Playwright's interactive UI runner (local debugging only).                                  |

## Detailed Guidance

### Development loops

- `npm run dev` — primary dev server. The app entry is `src/index.ts`; routes live in `src/routes/`, views in `src/views/` (`.eta`).
- Run `npm run dev:lint` in a second terminal for fast type feedback while coding.
- Run `npm run dev:test` for Vitest watch mode while writing unit tests.

### Tests

- Unit tests use **Vitest** — run them with `npm test` (one shot) or `npm run dev:test` (watch).
- E2E tests use **Playwright** — run them with `npm run e2e`; for interactive debugging use
  `npm run playwright:ui`. Placement and conventions: see the `testing` skill.
- A11y checks are wired into Playwright via the `checkA11y` fixture in
  `e2e-tests/fixtures.ts` — no separate script is needed.

### Type-checking / linting

- `npm run lint` is an aggregator (`run-s -l lint:*`) that runs every
  `lint:*` script in sequence. Add new `lint:*` entries to extend it rather than editing `lint` itself. Note that a single `*` does not match
  `:`, so `lint:eslint:fix` is intentionally excluded from the aggregator.
- `npm run lint:source` covers application code (`src/`).
- `npm run lint:e2e` covers e2e tests (`e2e-tests/`) using
  `tsconfig.e2e.json`.
- `npm run lint:eslint` runs ESLint via the flat config in
  `eslint.config.js`. Warnings-as-errors is enforced using `--max-warnings 0`, so any violation fails the script.
- Unused identifiers prefixed with `_` are ignored.
- Running `npm run lint` alone covers all three; `npm run verify` also relies on it.

### Build and run

- `npm run build` uses Vite (`vite.config.ts`) and writes output to `dist/`.
- `npm start` boots the built server with plain Node. Use it to validate that the production bundle works; `npm run dev` is preferred during development.
- `npm run clean` deletes `dist/`, `playwright-report/`, and `test-results/`
  when you need a fully fresh build/test run.

### Verification before submitting

Always run:

```bash
npm run verify
```

This chains `lint → test → build → e2e` via `npm-run-all` (and `lint`
itself fans out to `lint:source` + `lint:e2e`). Treat any failure as blocking — never weaken assertions or skip tests to make it pass.

## Conventions and Gotchas

- Node.js is pinned to **v26** via `mise.toml`; run `mise install` if your local Node version is wrong. `package.json` documents the floor as `"engines": { "node": ">=26" }`.
- Manual-only scripts that must never join `npm run lint`/`verify` get a **non-`lint:` name** (e.g. `check:actionlint`): the `lint:*` aggregator wildcard matches every single-level `lint:<name>` script, so a `lint:actionlint` name would silently be wired into `verify` and CI.
- `npm run release` is a **shell-out seam, deliberately not unit-tested** (spec "Testing Decisions" exempts it from the vitest coverage surface; it lives in `scripts/`, outside the `src/` coverage include). Its mechanics are exercised by the manual first-release run pushed as a `v*` tag.
- `tsx` is used as the dev runner; production runs plain `node` on the Vite output.
- `npm test` runs Vitest **once**. Use `npm run dev:test` for watch mode.
- `npm run e2e` requires Playwright browsers; if they are missing run
  `npx playwright install` once.
- HTTPS in dev requires local certs — see AGENTS.md "HTTPS & certificates".
- Local config comes from a `.env` file at the repo root (loaded by
  `src/config.ts` at startup). On a fresh checkout, copy `.env-template` to
  `.env` and adjust the values — `.env` is git-ignored, `.env-template` is tracked and is the source of truth for which variables exist.
- Do not invent new scripts ad-hoc; if a new workflow is needed, add it to
  `package.json` (and update this skill) so agents and humans share the same vocabulary.
