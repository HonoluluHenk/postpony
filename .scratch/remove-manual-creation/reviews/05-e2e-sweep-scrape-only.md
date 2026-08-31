# Code Review — 05-e2e-sweep-scrape-only

Fixed point: `72a94bd..HEAD` (commits `4e859fc` page objects, `14a3ac8` specs/flows, `6aa065f` ticket done)
Spec: `.scratch/remove-manual-creation/spec.md` + ticket `05-e2e-sweep-scrape-only.md`

## Standards

No documented-standard violations found (e2e typecheck, `tsconfig.e2e.json`, and ESLint all pass; coverage gate green). Judgement calls below.

- `e2e-tests/pages/CreatePage.ts` deleted; `pages/index.ts` export removed. No leftover `CreatePage` references anywhere in `e2e-tests/` (grep-verified).
- `e2e-tests/pages/EditPage.ts`: `createSession` now drives the scrape wizard (MTTV 2026/27 → O40 1. Liga → Ostermundigen → 14.01.2027) and drops the now-unusable `originalMatchDateTime` override param. The drilldown constants are module-level with an explanatory comment; `ScrapePage` and `isoToLocaleTokens` imports remain used. `changeMatchDetailsLink` getter intentionally kept — two e2e tests assert it has count 0.
- `e2e-tests/pages/StartPage.ts`: `createLink` removed (the manual `/create` link no longer exists); `scrapeLink` and `editLink` remain.
- Specs: `start-page.e2e.ts` asserts the scrape link has `href="/create/scrape"` and that no "create a new postponement" link exists; `postponement-creation.e2e.ts` replaces the manual-create happy path with the scrape → mint → read-only-summary flow; `scraping-flow.e2e.ts` replaces the change-mode test with a fresh-mint error path; `postponement-editing.e2e.ts` replaces the in-place change test with a no-change-action assertion; `clash-checks.e2e.ts` drops the "not checked" hand-entered test (unreachable in a scrape-only world) and documents why; `error-handling.e2e.ts`, `focus-management.e2e.ts`, `localization.e2e.ts`, `semantic-structure.e2e.ts`, `proposed-date-generator.e2e.ts`, `join-voting.e2e.ts`, `invitation-link.e2e.ts` updated to the scrape-only surface / new 5-player roster counts. Comments updated alongside behaviour (no stale manual-create references; grep-verified).
- Screenshot baselines: `create-chromium-linux.png` deleted, `scrape-leagues-chromium-linux.png` added, and the four `postponement-editing` + `join` baselines regenerated for the scrape-only UI; full e2e run confirms they match (no diff).
- No removed translation keys are re-referenced (`change_match_details` in `edit-page.spec.tsx:50` is an absence assertion from ticket 04, not a usage).

Smell baseline — judgement calls, one actionable:

- **Duplicated Locator Navigation (mild, actionable)**: the fresh-mint test in `scraping-flow.e2e.ts:313-323` reaches into raw CSS/id locators (`page.locator('.match-summary')`, `page.locator('#status-chip')`, `page.locator('#proposed-date-list .proposed-date-card')`) after `page.goto(session.editUrl)`, where the `EditPage` page object already exposes `heading`, `matchSummary`, `status`, and `proposedDateRows`. The repo's testing skill prefers the page-object seam over raw selectors in tests. Not a hard violation (page objects themselves use these CSS-class locators), but the test should reuse the seam.

## Spec

Acceptance criteria:

1. Full e2e flow scrapes a Match, mints a Postponement, lands on its edit page with a read-only Match summary — `postponement-creation.e2e.ts` "scrapes a Match, mints a Postponement…" asserts `matchSummary` contains "Match: Thun vs Ostermundigen" and the original datetime, plus owner password, Draft status, and invite links. ✔
2. E2e error path submits a scrape with leftover change parameters → fresh mint, existing untouched — `scraping-flow.e2e.ts` "a scrape submission carrying leftover change parameters behaves as a fresh mint" posts the harvested match form plus `sessionId`/`ownerPassword`, asserts a 302 to a *new* id (≠ original), a live minted edit page, and the original Postponement unchanged (same match summary, same status, its proposed date still present). ✔
3. E2e path confirms the edit page offers no change action — `postponement-editing.e2e.ts` "edit page shows the referenced Match read-only with no change action" and `scraping-flow.e2e.ts` "edit page shows the referenced Match read-only and no change action" both assert `changeMatchDetailsLink` count 0 and no "Find the match on click-tt.ch instead" link. ✔
4. E2e passing for the reworked creation/scraping/start-page flows — full suite **88/88 PASS**. ✔
5. `verify` gate green with coverage ≥ 80% — **lint PASS, test PASS (coverage: statements 88.9%, branches 80.8%, functions 92.9%, lines 88.9%), build PASS, e2e 88/88 PASS**. ✔

No scope creep: every change serves the scrape-only sweep (page objects, specs, baselines). No missing behavior. The two in-flight bugs found on takeover (fresh-mint orientation assertion; original session status asserted as Draft instead of its actual Voting state after `createSession` adds a date) were corrected before the `ticket done` commit.

## Summary

Standards: 0 hard findings (worst: minor raw-locator vs page-object inconsistency in the fresh-mint test). Spec: 0 code findings — all five criteria implemented and gate-green. Clean, spec-faithful sweep; one small page-object reuse fix queued.