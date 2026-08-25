# 03: Vitest browser project runs a first real spec

**What to build:** A single test run executes two Vitest projects: the existing node project for the server-side TypeScript specs, and a new headless Chromium project for the client-side JavaScript. A first co-located spec proves the layer works by asserting the spinner's show and hide against a real DOM — the active class, the ARIA hidden and busy state, and the body loading class, with hide *removing* the busy attribute rather than setting it false. Client-side JavaScript now counts toward the coverage report, while vendored scripts and the decision-free bootstrap entry do not. Co-located spec files are neither served to visitors nor uploaded as static assets, and an e2e request assertion proves it.

**Blocked by:** 02 (Client-side JS becomes ES modules).

**Status:** ready-for-agent

- [ ] Exactly one new dev dependency: the Playwright provider for Vitest Browser Mode, reusing the already-installed Chromium binary
- [ ] The Vitest config declares two named projects, `unit` and `browser`, both inheriting the root config so the path alias and one coverage report are shared
- [ ] Per-project options (environment, globals, type-checking, include globs) live inside the projects, since root-level test options are ignored once projects are defined
- [ ] The browser project is headless by default, so the watch task never opens a window
- [ ] The existing server-side specs still run and still type-check, with no behaviour change
- [ ] Coverage include is extended to client-side JavaScript; vendored scripts, spec files and the bootstrap entry are excluded
- [ ] A co-located spinner spec asserts show and hide on both classes and ARIA state and passes in the browser project
- [ ] Spec files under the served asset root are excluded from the static-asset upload and 404 from the static handler, with the shortcut marked by a ponytail comment naming the upgrade path
- [ ] The start-page e2e spec gains one request-level assertion that a client-side spec file is not fetchable
- [ ] No new npm script and no new CI step: the existing test and verify gates pick the browser project up for free
