# 01: Record the Browser Mode decision

**What to build:** The question "should we migrate the Playwright e2e suite to Vitest Browser Mode?" is answered once and for all in the architecture record. A new ADR (0020) states the evaluation and its rejection with the concrete blockers named, decides that Playwright stays the sole e2e driver, and adopts Browser Mode only for the client-side JavaScript. The existing e2e-testing ADR points at it, and the agent guidelines name the two Vitest projects so a contributor knows where a new test belongs without reading the config.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] ADR-0020 exists with Status Accepted and follows the house Context / Decision / Rationale / Consequences shape
- [ ] Context names the verified blockers: test files run in an iframe on the Vite server with the base forced to the root; the exposed page handle is not Playwright's and cannot navigate; no API request context (relied on by the error-handling and start-page suites); no browser-context handle (relied on by the localization suite's cookie fallback); the axe integration is Playwright-bound
- [ ] Decision states Playwright remains the sole e2e driver and Browser Mode is adopted only for the client-side asset scripts
- [ ] Consequences record the re-evaluation trigger: real navigation plus an API request context in Browser Mode
- [ ] ADR-0005 gains a "see also" line pointing at 0020 and keeps its Accepted status
- [ ] The testing sections of the agent guidelines name the `unit` and `browser` Vitest projects and state that one test run executes both
- [ ] No e2e spec, page object, Playwright config or npm script is touched
