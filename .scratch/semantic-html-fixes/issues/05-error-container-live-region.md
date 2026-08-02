# 05 — Consistent error-container live region

**What to build:** The global error banner announces identically whether it appears on the initial page render or after an HTMX swap. The error container no longer carries container-level live-region semantics; the inner `role="alert"` remains the single (assertive) live region in both paths.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] The error container has the same live-region semantics in both the initial render and the HTMX-swapped partial — no `aria-live` on the container in either.
- [ ] A global or validation error is still announced via the inner `role="alert"` in both paths.
- [ ] Error-handling e2e tests still pass.
