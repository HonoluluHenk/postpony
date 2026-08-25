# 02: Client-side JS becomes ES modules

**What to build:** The hand-written client-side JavaScript is importable. The spinner exports its class plus the two predicates its submit and click listeners share — "is this element HTMX-driven?" and "should a spinner be shown for this element?" — and every page-bootstrap init function moves into a shared UI module with no top-level side effects. Two impure spots gain a pure core: a predicate over an HTMX error response body deciding whether it carries non-out-of-band content worth swapping, and a function that takes the current query string, path, document language and stored language and returns either nothing (stay put) or the URL to navigate to; the location assignment stays in the caller. The bootstrap entry keeps its asset URL and shrinks to imports plus the existing window-load listener, and the layout's two classic script tags collapse into one module script. For anyone using the app, nothing changes.

**Blocked by:** None (can start immediately). Independent of ticket 01 — different seam.

**Status:** ready-for-agent

- [ ] The spinner module exports its class instead of assigning a global; the CommonJS/global footer is gone
- [ ] The HTMX-driven and should-show-spinner predicates are exported and are the single rule both the submit and the click listener apply
- [ ] Every init function lives in a shared UI module, exported, with no top-level side effects
- [ ] The error-swap decision and the language-redirect decision are exported pure functions; their side effects stay in the init functions
- [ ] The bootstrap entry contains only imports and the window-load listener, and its URL is unchanged
- [ ] The layout loads one module script in place of the two classic tags
- [ ] The obsolete CommonJS globals and the spinner global entry are removed from the ESLint override for client-side JS
- [ ] Files stay JavaScript — no TypeScript conversion, no test-only branches or hooks in production code
- [ ] Lint is clean at zero warnings and the full Playwright suite is green: the date-picker, focus-management, localization and responsive suites plus the delete-dialog flows are the regression net for the script-tag change
