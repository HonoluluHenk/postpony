# 01: Viewport-parameterised e2e harness for the edit page

**What to build:** The postponement-editing e2e suite can run any assertion at phone (390px), tablet (820px) and desktop (1282px) widths through one small helper, so every later layout fix ships with a check at the width where it broke. Existing tests and screenshot baselines stay unchanged and green.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] A helper (fixture or utility) sets the viewport to a named width: `phone` 390x844, `tablet` 820x1180, `desktop` 1282x745
- [x] One smoke test opens the edit page with a seeded Postponement at each width and passes `checkA11y`
- [x] Existing editing e2e tests and their baselines are untouched and green
- [x] `npm run verify` passes

## Comments

- f007011 — ticket done: 01-viewport-e2e-harness (viewports.ts + viewport-smoke.e2e.ts + ticket ticks)
- e30a655 — review: 01-viewport-e2e-harness (0 hard standards violations, 0 spec findings)

One-line summary: added a named-viewport harness (phone 390x844 / tablet 820x1180 / desktop 1282x745) and an a11y smoke test that runs the edit page at each width; existing editing tests and baselines stay untouched and `npm run verify` passes.
