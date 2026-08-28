# 03: Edit page uses registry

**What to build:** the initial edit page composes its data-bearing sections through the same registry as the partial endpoint. Page-only chrome — success toast, `InviteLinks`, scheduling-engine-info heading, `ChangeMatchDetails` link — stays where it is. From the user's perspective, the hard-reloaded edit page is byte-identical to today.

**Blocked by:** 01-registry-prefactor

**Status:** ready-for-agent

### What ships

- `<EditPage>` walks the registry for the data-bearing sections (`status-chip`, `own-team-votes`, `proposed-dates-section`, `vote-tally-section`, `team-section`).
- Page-only blocks remain at their current positions relative to the registry composition.
- `edit-handlers.spec.ts` (the GET path), `edit.tsx` reads, and any related specs assert the initial page list against the registry.

### Decisions

- Display order inside the scheduling engine block is the registry's display order (teammates-then-dates-then-votes-then-tally becomes explicit and reviewable in one place — `getEditPartials()`).

### Acceptance criteria

- [ ] `<EditPage>` source contains no hand-written list of data-bearing sections; it walks the registry inside the scheduling-engine block.
- [ ] Initial edit page screenshots (full-page Playwright baseline) continue to match byte-for-byte.
- [ ] GET-path vitest specs verify initial composition lists each registry entry under the scheduling engine heading.
- [ ] No `oob?: boolean` prop remains in `<EditPage>` or any consumer of the registry.
