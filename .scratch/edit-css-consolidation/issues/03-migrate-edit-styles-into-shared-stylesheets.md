# 03: Fold the redesign into the shared stylesheets and tokenize

**What to build:** Make the design system the single owner of the edit-page redesign. Move the live prototype rules into the shared app stylesheet as a commented edit-page section inside the design cascade layer, and move the six `@font-face` declarations there too, above the layer block. Replace every literal spacing, type, radius and colour value in the migrated rules with the tokens from ticket 02; white card surfaces use the framework's lowest-surface token. Keep the page-scoped rules under the `.edit-redesign` wrapper, and keep the page-headline rules unscoped because the headline renders in the shared layout header. Replace the edit page's `1024px`/`1023px` breakpoints with the framework's `993px`/`992px` medium breakpoint already used by the shared stylesheet. Delete the prototype stylesheet and remove its link from the shared layout.

The migrated page is the same redesigned edit page, with only the intended snap-to-scale drift (at most ~2px spacing, ~1px type). No other page changes.

**Blocked by:** 02

**Status:** ready-for-agent

- [x] The prototype stylesheet no longer exists and is no longer linked; its live rules and `@font-face` declarations are in the shared stylesheet.
- [x] No literal spacing, font-size, radius or colour remains in the migrated rules (1px borders and token values excepted).
- [x] The edit page uses `993px`/`992px` breakpoints; the page still switches from stacked to two-column at the medium breakpoint.
- [x] Only the edit-page screenshots change; the other committed baselines are untouched. Regenerated edit baselines are reviewed before commit.
- [x] `npm run lint`, `npm run test` and `npm run e2e` pass.
