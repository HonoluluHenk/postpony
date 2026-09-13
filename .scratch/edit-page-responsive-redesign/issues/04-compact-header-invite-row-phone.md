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

## Comments

- Implemented in `9148eeb` (ticket done: 04-compact-header-invite-row-phone); reviewed in `a9286f6` (review: 04-compact-header-invite-row-phone) — one finding fixed in `99cd52c` (review-fixed: 04-compact-header-invite-row-phone).
- Summary: `--h1-size` is now a clamp between a phone size and the 2rem desktop size; the two invitation-link rows drop `wrap` (nowrap override + link shrink via `min-width: 0`/`white-space: normal`/`overflow-wrap: anywhere`); the clipboard button idle opacity rises to 0.75; and the match-summary paragraph wraps inside the viewport (interim, deleted in ticket 06). The review finding was that BeerCSS's `:is(ol,ul)>li>:is(a,label){white-space:nowrap}` defeated `overflow-wrap` on the invite-link anchor, so `white-space: normal` was added to let the link genuinely shrink. A phone-viewport e2e test asserts the copy button and its link share the same vertical band with no viewport overflow; `checkA11y` passes and the screenshot baselines needed no regeneration (the opacity shift is below the 2% tolerance).
