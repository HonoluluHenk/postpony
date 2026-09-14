# Code review: 04-fix-warning-chip-contrast

Fixed point: `4d955b2` (`git diff 4d955b2...HEAD`).
Commits under review: `be70051 ticket done: 04-fix-warning-chip-contrast`.
Spec: `.scratch/edit-css-consolidation/spec.md`. Ticket: `.scratch/edit-css-consolidation/issues/04-fix-warning-chip-contrast.md`.
Standards sources: `AGENTS.md`, `.agents/skills/css-styling/SKILL.md`, `.agents/skills/testing/SKILL.md`, ADRs 0004/0005/0019, plus the Fowler smell baseline.

(Sub-agents unavailable in this environment; both axes were reviewed directly.)

## Standards

- **No hard violations.** The production change is exactly two token values in `design-tokens.css`; the chip selector `.date-chips .chip--warn` in `style.css` was not touched, so the declarative seam stays where ticket 03 left it. `css-styling` convention 2 ("token, not literal") is advanced: `--chip-warn-bg`/`--chip-warn-fg` now alias the existing `--warning-container`/`--on-warning-container` pair instead of carrying their own literals.
- **Test assertion update is correct and required.** `clash-checks.e2e.ts` asserted the old background `rgb(255, 246, 230)`; the diff updates it to the new pair plus adds a foreground assertion. This follows the `testing` skill (assert rendered computed values, not CSS internals) and is the only behavioural guard that actually renders the `chip--warn`. Leaving it stale would have made `npm run e2e` red, which the ticket forbids.
- **Comment accuracy.** Both the CSS and the e2e comment claim `10.5:1`; the computed ratio for `#ffe082` on `#3d2b00` is **10.52:1**, matching `design-tokens.css`'s own documented figure. Judgement call only: a purist might write `10.52`, but the repo standard is already `10.5`.
- **Smell baseline:** none apply. Two-line declarative config, no control flow, no new abstraction, no duplication introduced; the added assertion is not a repeated shape worth extracting.
- **Judgement call — baseline churn.** The four `edit-*.png` baselines were regenerated with `--update-snapshots=all`; their only pixel delta is rows 206–220 (the shared page headline), i.e. pre-existing stale font rendering, *not* the chip. The orchestrator explicitly pre-authorised "unrelated edit-page pixels" normalization, so this is in-policy, but it is churn unrelated to the fix and does not guard the fix.

## Spec

- **Token repoint exact.** Spec: "the warning chip is then repointed to `--warning-container` / `--on-warning-container`"; ticket asks for `--chip-warn-bg: var(--warning-container)` and `--chip-warn-fg: var(--on-warning-container)`. Both match byte-for-byte. ✔
- **Markup/class unchanged.** `proposed-dates-section.tsx` still emits `class="chip chip--warn"`; no template diff in `4d955b2...HEAD`. ✔
- **Contrast ≥ 4.5:1.** `#ffe082` on `#3d2b00` = 10.52:1 (former pair = 3.95:1). ✔
- **axe green.** The chip is only rendered by `clash-checks.e2e.ts`, whose `checkA11y()` now runs against the new colours; full `npm run e2e` is 118/118. ✔
- **Gate.** `npm run lint` clean; `npm run test` passes (coverage summary prints, no threshold failure); `npm run e2e` 118/118. ✔
- **Observation — no snapshot covers the warn chip.** None of the four `postponement-editing` baselines renders a busy hall (no proposed date in those tests overlaps a fixture meeting), so the regenerated PNGs do **not** show the amber chip. The ticket's parenthetical expectation ("the warning chip's text/background should now use the amber container pair" in the regenerated baselines) is therefore not observable there; the fix's rendered behaviour is covered instead by the updated `clash-checks` computed-colour assertion and axe. This is a coverage note, not a spec breach — the spec says "no new seams are introduced".
- **Deviation from the orchestrator's commit list (justified).** The prescribed implementation commit named only the CSS, the ticket, and the `edit-*.png` baselines. `e2e-tests/clash-checks.e2e.ts` had to be included to keep `npm run e2e` green; it is staged in the same commit.
- **Regeneration mechanics.** Default `--update-snapshots` (`changed` preset) rewrote nothing because the stale headline diff is far under the 2% `maxDiffPixelRatio`; `--update-snapshots=all` was used to refresh them deliberately. Only the four `edit-*.png` changed; no non-edit PNG moved. ✔

Summary: Standards 0 hard violations / 1 in-policy judgement call (stale-unrelated baseline churn); Spec complete, 1 coverage observation (warn chip absent from the edit-page snapshots, guarded instead by the `clash-checks` colour assertion + axe).
