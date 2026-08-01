# 04 — Header reflows on phones

**What to build:** Below 600px the header wraps so the page title drops onto its own line instead of being clipped between the logo and the language buttons. The title is never truncated.

**Blocked by:** 01 — Widen the layout to 1200px

**Status:** ready-for-agent

- [ ] Below 600px the header row is allowed to wrap; the page title renders fully on its own line
- [ ] At 600px and wider the header stays a single row — no change
- [ ] A focused e2e check at 375px verifies the title is fully visible (not clipped)
- [ ] `npm run lint`, `npm run test`, `npm run e2e` pass

## Comments

- Spec: `.scratch/responsive-layout/spec.md`, "Header" decision.
