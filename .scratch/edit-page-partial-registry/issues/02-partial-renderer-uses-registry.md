# 02: Partial renderer uses registry

**What to build:** the post-mutation partial response is now registry-driven. Every HTMX swap target the server can emit on the partial endpoint is enumerated by `getEditPartials()`. The hand-written `ProposedDatesSectionPartial` wrapper goes away; `renderEditPartials` walks the registry and wraps each entry in `<OobShell>`.

**Blocked by:** 01-registry-prefactor

**Status:** ready-for-agent

### What ships

- `renderEditPartials` consumes `getEditPartials()`, builds the props from `buildEditPartialsData` for the data-bearing sections, and emits each entry wrapped in `<OobShell>` (plus the error container as an OOB sibling).
- `ProposedDatesSectionPartial` is deleted; the registry's `proposed-dates-section` entry replaces it.
- The corresponding vitest specs assert against the registry-driven output for the partial endpoint, replacing the hand-tree assertions.

### User-visible behaviour

After any post mutation (propose date, change visibility, delete date, confirm, reopen), the partial response body contains the exact same DOM elements (same root `id`s, same `hx-swap-oob="true"`) it does today, in the same order. No visual regression.

### Acceptance criteria

- [ ] `renderEditPartials` source contains no hand-written list of partial pieces; it walks `getEditPartials()`.
- [ ] `ProposedDatesSectionPartial` no longer exists; no other code imports it.
- [ ] Each post-handler spec (`edit-handlers.spec.ts`) verifies the partial response contains one OOB target per registry entry with the matching `id`.
- [ ] Output of each partial endpoint matches its existing Playwright screenshot baseline.
- [ ] Coverage floor still ≥ 80% across all metrics.
