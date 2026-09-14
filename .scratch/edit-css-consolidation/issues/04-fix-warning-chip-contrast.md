# 04: Fix warning-chip contrast to WCAG AA

**What to build:** Make the edit page's "hall busy" (Venue Occupancy) warning chip readable for low-vision users. Point the warning chip's background and foreground tokens at the framework's warning container pair so the text contrast is at least 4.5:1 (it is currently 3.95–4.24:1 against a 4.5:1 minimum). The chip selector itself does not change — only the two token values — so the fix lives in one place and matches the existing occupancy warning treatment.

**Blocked by:** 03

**Status:** ready-for-agent

- [x] The warning chip's text contrast against its background is at least 4.5:1 (axe on the edit page is green).
- [x] The chip's class and markup are unchanged; only token values changed.
- [x] Edit-page screenshot baselines are regenerated and reviewed before commit.
- [x] `npm run lint`, `npm run test` and `npm run e2e` pass.

## Comments

- `be70051` ticket done: 04-fix-warning-chip-contrast — repointed `--chip-warn-bg`/`--chip-warn-fg` to `--warning-container`/`--on-warning-container` (3.95:1 → 10.52:1), updated the `clash-checks` computed-colour assertion to the new pair, and refreshed the four `edit-*.png` baselines.
- `381272e` review: 04-fix-warning-chip-contrast — no real issues (Standards 0 hard violations, Spec complete; one coverage observation: no edit-page baseline renders a busy hall, so the chip is guarded by the `clash-checks` colour assertion + axe rather than a snapshot).
- Note: the `clash-checks.e2e.ts` assertion update was not in the orchestrator's named commit list but was required to keep `npm run e2e` green; default `--update-snapshots` rewrote nothing (stale headline delta < 2% threshold), so `--update-snapshots=all` was used. Only the four `edit-*.png` baselines changed.
