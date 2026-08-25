# ADR 0020: Vitest Browser Mode for Client-Side Testing

## Status

Accepted

## Context

PostPony's client-side JavaScript (the spinner module, the shared UI module) runs in the browser but has so far been tested only indirectly through Playwright e2e suites. Vitest Browser Mode promises to let us unit-test this code in a real browser environment without a full Playwright round-trip.

However, the team verified four concrete blockers that prevent Browser Mode from replacing or even complementing our existing e2e suites:

1. **Test files execute inside an iframe** served by the Vite dev server with the base path forced to the root — tests cannot access the real application page.
2. **The exposed `page` handle is not Playwright's page object** and has no navigation API — no `page.goto()`, no URL assertions, no redirect following.
3. **There is no API request context** (e.g. `request.post()`), which is relied on by the error-handling and start-page suites.
4. **There is no browser-context handle** (e.g. `context.addCookies()`), which is relied on by the localization suite's cookie fallback tests.

A fifth blocker is indirect: the axe integration backing [ADR-0004](0004-accessibility-standards.md) is Playwright-bound (`@axe-core/playwright`), not available inside Browser Mode.

## Decision

- **Playwright remains the sole e2e driver.** All existing e2e suites stay on Playwright; no e2e tests are migrated to Browser Mode.
- **Vitest Browser Mode is adopted for unit-testing client-side JavaScript** — specifically the spinner module and the shared UI module.
- **A second Vitest project (`browser`)** runs in headless Chromium via the `@vitest/browser` Playwright provider. The existing `unit` project (node environment, TypeScript specs) is unchanged.
- **One `vitest run` executes both projects.** No separate npm script is needed.

## Rationale

The app's e2e value is the server round-trip: navigation, redirects, boosted full-page swaps, cookie fallbacks, malformed POST bodies, and axe-driven accessibility assertions. Browser Mode cannot drive any of it — it has no real page navigation, no API request context, no browser-context cookie manipulation, and no Playwright-bound axe integration.

Browser Mode *can* exercise the client-side modules in a real browser DOM (e.g. testing that a spinner module attaches/detaches the correct DOM elements), which is the gap it fills.

## Consequences

- **Re-evaluation trigger**: real navigation plus an API request context inside Browser Mode. If either lands, the rationale for keeping e2e on Playwright alone weakens and this ADR should be revisited.
- **Co-located spec files must not ship**: Browser Mode specs (e.g. `*.browser-spec.ts`) must be excluded from the static build output to avoid shipping test code to production.
