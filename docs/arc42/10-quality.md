# 10. Quality Requirements

This section records only the quality goals that are **evidenced** by code and ADRs. Performance, availability, and data-residency targets have not been negotiated and are deliberately left unspecified.

## 10.1 Quality tree

### Accessibility

- **Goal:** WCAG 2.2 Level AA (ADR-0004).
- **Scenario:** a screen-reader or keyboard user can complete the entire create → propose → vote → confirm flow.
- **Enforced by:** axe-core audits (`wcag2a/2aa/21a/21aa/22a/22aa`) in every e2e spec, plus dedicated `semantic-structure`, `focus-management`, `responsive` suites. Zero-violation assertion.

### Testability

- **Goal:** domain logic is unit-testable without I/O.
- **Scenario:** a developer can exercise any postponement operation (propose, vote, confirm, reopen, delete) with deterministic ids and a fixed clock.
- **Enforced by:** the `newId()`/`now()` seam and `FakePostponementRules`; the pure `session → session` contract.

### Portability

- **Goal:** one codebase runs identically on Node (dev) and Cloudflare Workers (prod).
- **Scenario:** any change must not introduce a Node-only static import that breaks the Worker bundle.
- **Enforced by:** `worker.ts` + `src/index.ts` sharing `buildApp`; non-literal dynamic imports for Node-only modules; `npm run worker:build` (wrangler dry-run).

### Deterministic e2e

- **Goal:** integration tests are offline and reproducible.
- **Scenario:** a full e2e run passes with no network access to click-tt.ch.
- **Enforced by:** the scraper fixture seam (`APP_CLICK_TT_FIXTURES_DIR`), always set in the Playwright webServer env.

### Code coverage

- **Goal (policy):** ≥ 90 % for all metrics (`AGENTS.md`).
- **Status:** **machine-enforced** — via vitest `thresholds` block.

## 10.2 Not specified

The following have no agreed target; they are flagged for later definition rather than invented here:

- **Performance** (latency budgets, throughput).
- **Availability** (uptime SLO, error-budget).
- **Data residency** (beyond the incidental fact that Turso is in AWS eu-west-1).
