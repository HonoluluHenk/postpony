# 01: Viewport harness gains a 360px phone

**What to build:** The shared e2e viewport helper gains a `phoneSmall` 360x740 entry (`phone` 390x844, `tablet`, `desktop` stay untouched), so a later ticket can assert the vote page layout at the width where the "Set all" row clips. No production code changes.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] The helper exposes a `phoneSmall` 360x740 viewport alongside the existing named widths
- [x] A smoke test opening the vote page at `phoneSmall` passes `checkA11y`
- [x] Existing e2e tests and screenshot baselines are untouched and green
- [x] `npm run verify` passes

## Comments

- Implementation `58f29b9`, review `c67b2c5`. Added `phoneSmall` 360x740 to the shared viewport helper and a vote-page `checkA11y` smoke test at that width; no production code touched, no review findings.
- `npm run verify` passed (lint, test, build, 121 e2e). Screenshot baselines unchanged.
