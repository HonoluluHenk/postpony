# 01: Viewport-parameterised e2e harness for the edit page

**What to build:** The postponement-editing e2e suite can run any assertion at phone (390px), tablet (820px) and desktop (1282px) widths through one small helper, so every later layout fix ships with a check at the width where it broke. Existing tests and screenshot baselines stay unchanged and green.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] A helper (fixture or utility) sets the viewport to a named width: `phone` 390x844, `tablet` 820x1180, `desktop` 1282x745
- [x] One smoke test opens the edit page with a seeded Postponement at each width and passes `checkA11y`
- [x] Existing editing e2e tests and their baselines are untouched and green
- [x] `npm run verify` passes
