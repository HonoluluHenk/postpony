# 05 — CI a11y enforcement

**What to build:** Add a CI pipeline (GitHub Actions) that runs the existing Playwright a11y tests on every push/PR, closing the gap between ADR-0004 (WCAG 2.2 AA commitment) and the lack of automated enforcement.

**Status:** ready-for-agent

**Blocked by:** Tickets 01–04 must be resolved first — running CI before those fixes would produce red builds.

## What to build

- Create `.github/workflows/a11y.yml` (or extend an existing CI workflow if one is added later)
- Install dependencies, build, run `npx playwright install --with-deps chromium`
- Run `npm run e2e` (or a focused `npx playwright test --grep @a11y` — add `@a11y` tags to tests if needed)
- Fail the build on any `checkA11y()` violation
- Use Playwright's built-in reporters for output
- Run on push to main and on all PRs

## Out of scope

- Lighthouse, pa11y, or other tools — axe-core via the existing `checkA11y` fixture is sufficient
- Performance budgets or SEO checks — a11y only

## Acceptance criteria

- [ ] GitHub Actions workflow exists at `.github/workflows/a11y.yml`
- [ ] Workflow runs `npm run e2e` and fails on a11y violations
- [ ] Workflow completes in under 5 minutes
- [ ] ADR-0004 is now practically enforced
