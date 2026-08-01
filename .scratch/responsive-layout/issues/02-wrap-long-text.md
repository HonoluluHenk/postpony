# 02 — Wrap long text instead of clipping

**What to build:** In the edit page's management lists, proposed-date strings, player names, and invitation links wrap within their columns instead of overflowing, so the "away team votable" switches and the copy buttons next to the invitation links stay visible and clickable. Long text is wrapped, never truncated.

**Blocked by:** 01 — Widen the layout to 1200px

**Status:** ready-for-agent

- [ ] Proposed-date strings wrap inside their list rows instead of blowing out horizontally (the flex text box is allowed to shrink and wrap)
- [ ] Player names wrap the same way
- [ ] The two invitation-link rows wrap long `?token=` URLs instead of clipping
- [ ] A focused e2e check at a phone viewport verifies that a proposed-date row's switch is fully visible and clickable when a long date is present
- [ ] `npm run lint`, `npm run test`, `npm run e2e` pass

## Comments

- Spec: `.scratch/responsive-layout/spec.md`, "Long text: wrap, never truncate" and "Invitation links" decisions.
