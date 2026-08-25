# ADR 0005: E2E Testing Tool - Playwright

## Status
Accepted

## Context
We need a reliable, modern end-to-end (E2E) testing tool to ensure the application's core workflows (rescheduling, voting, invitation) work as expected across different browsers. Furthermore, given our requirement for **WCAG 2.2 AA** compliance, the testing tool should ideally support accessibility auditing.

## Decision
We will use **Playwright** as our primary tool for end-to-end testing.

## Rationale

* **Cross-Browser Support**: Playwright supports all modern rendering engines (Chromium, WebKit, and Firefox)
  out of the box.
* **Reliability**: It features auto-waiting and resilient selectors, reducing test flakiness.
* **Accessibility Testing**: Playwright integrates well with accessibility testing libraries like
  `@axe-core/playwright`, which will help us automate **WCAG 2.2 AA** checks.
* **Mobile Emulation**: It allows us to test the mobile-responsive versions of our application easily.
* **Developer Experience**: High-quality tooling for debugging (Trace Viewer, Codegen) and support for multiple languages.

## Consequences

* The development pipeline (CI/CD) must be configured to run Playwright tests.
* The team will need to learn Playwright's API and best practices for writing E2E tests.
* Accessibility checks will be integrated into the E2E test suite.

## See also

- [ADR-0020: Vitest Browser Mode for client-side testing](0020-vitest-browser-mode-client-testing.md)
