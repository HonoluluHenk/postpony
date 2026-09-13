# 04: Compact heading and invitation row on phone

**What to build:** On a phone the page heading is smaller so Proposed Dates appear near the top, the language selector stays in the header row, each copy-to-clipboard button sits beside its invitation link, and the Match summary line never overflows the viewport.

**Blocked by:** 01 (Viewport-parameterised e2e harness)

**Status:** ready-for-agent

- [x] The h1 size token is a clamp between a phone size and the current 2rem desktop size
- [x] Language selector remains in the header row on phone (does not drop to its own line)
- [x] Invitation link rows do not wrap; the link may shrink; the clipboard button idle opacity is raised so it reads as a control
- [x] Match summary paragraph wraps within the viewport (interim; deleted in ticket 06)
- [x] e2e at phone: clipboard button and its link share the same vertical band; no element exceeds viewport width
- [x] `checkA11y` passes; screenshot baselines regenerated where changed
- [x] `npm run verify` passes
