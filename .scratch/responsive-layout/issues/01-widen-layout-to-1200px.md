# 01 — Widen the layout to 1200px

**What to build:** On desktop, the app renders up to 1200px wide instead of a cramped 800px column, so the edit page's management grid and vote-tally sections get real room. The container width design token is raised to 75rem (1200px); below that the container stays fluid. This is the foundation every other layout fix builds on.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Container width raised from 800px to 75rem (1200px), matching the framework's own ceiling for the main content area
- [ ] The container stays fluid (`width:100%`) below the 1200px cap — no fixed-width regression on smaller viewports
- [ ] Verified by opening pages on a wide (≥1200px) viewport: no layout regression in the header, edit grid, vote-tally sections, or scrape wizard
- [ ] No automated assertion in this ticket — the desktop-width e2e check is delivered by ticket 05
- [ ] `npm run lint`, `npm run test`, `npm run e2e` pass

## Comments

- Spec: `.scratch/responsive-layout/spec.md`, "Container width" decision.
