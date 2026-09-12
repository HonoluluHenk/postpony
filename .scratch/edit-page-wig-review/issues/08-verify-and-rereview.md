# 08: Verify and re-review

**What to build:** The full CI gate passes with all fixes landed, and a fresh Web Interface Guidelines review of the live edit page reports only the three intentionally deferred items.

**Blocked by:** 01, 02, 03, 04, 05, 06, 07

**Status:** ready-for-agent

- [x] `npm run verify` (lint, test, build, e2e) passes
- [x] Coverage stays at or above 80% for all metrics
- [x] Re-run the web-design-guidelines review against the edit page URL; remaining findings are limited to: language select as links, shared single delete dialog, `beforeunload` guard for the generator form
- [x] Spec's Out of Scope section still matches the remaining findings; update it if anything else was consciously deferred

## Comments

- `90dd979` ticket done: 08-verify-and-rereview — fixed the two date-rotted e2e tests in `proposed-date-generator.e2e.ts` (`to ≤ from` now uses `isoDate(1)`/`isoDate(0)`; the anchor-window test uses `isoDate(0)`/`isoDate(6)`, which guarantees one Wed + one Sat on any wall-clock date) and updated their stale comments/token assertions; `npm run verify` passes end to end (lint, test with coverage, build, 92/92 e2e). Fresh web-design-guidelines re-review of the live edit page (code read + live DOM + axe/Lighthouse a11y=100): the three deferred items hold, and two additional minor AT-facing findings were found and added to the spec's Out of Scope — (1) add-date/generator success toasts stay `role="alert"` (assertive) alongside the polite `role="status"` announcement (same short outcome announced twice); (2) the edit-page `<h1>`'s accessible name (page title) embeds the original match datetime in input-token format while the visible heading reads Intl. Coverage: statements 89.4%, branches 81.72%, functions 92.44%, lines 89.78%.

- `72f98d4` review-fixed: 08-verify-and-rereview — both additional findings were fixed in-scope instead of deferred (they violated stories 1 and 6): the add-date/generator success toasts dropped `role="alert"` so the polite `role="status"` announcement is the single announcement (e2e toast locators switched to `.toast.success`), and the `<h1>` no longer overrides its accessible name with the token-format title (the visible Intl heading text is now the accessible name). The two spec Out-of-Scope bullets were reverted. Lint + full vitest + touched e2e suites green; isolated toggle-vote flake passed on rerun.
