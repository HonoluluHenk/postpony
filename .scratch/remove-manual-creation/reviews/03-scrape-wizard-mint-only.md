# Code Review — 03-scrape-wizard-mint-only

Fixed point: `72ed7e9` (commit `72ed7e9 ticket done: 03-scrape-wizard-mint-only`)
Spec: `.scratch/remove-manual-creation/spec.md` + ticket `03-scrape-wizard-mint-only.md`

## Standards

No documented-standard violations found.

- `src/routes/create/scrape/match-post.ts`: collapses the mint/change `if/else` into a single mint path (`id = generateId()`, fresh owner + invitation passwords). This removes the duplication the old `else` branch shared with the mint logic. Type annotations, naming, and `Promise.all` player/venue scraping unchanged; the dropped `requireChangeSession` import was the only external reference to the deleted helper.
- The four step views (`leagues`, `groups`, `teams`, `matches`) and their `*-get.tsx` handlers: `WizardChangeMode` fully removed from the props; all `changeMode ? ... : ...` branches collapsed to the mint branch. The leagues back link was correctly redirected from `/create` (deleted by ticket 02) to `/create/scrape`. No orphaned props, no leftover change context.
- `change-utils.ts` deleted — no remaining references (verified by full-repo grep: `change-utils|requireChangeSession|changeQuerySuffix|WizardChangeMode|changeMode` all gone from src and e2e-tests).

Smell baseline — judgement calls only, none actionable:
- None. This is a deletion-focused change; the spec/criteria explicitly call for removing the change-mode machinery, which the diff does wholesale rather than leaving middle-man or speculative-generality residue.

## Spec

Acceptance criteria:

1. A scrape POST always mints a new Postponement (new id, new owner/invitation passwords) — `match-post.ts` unconditionally mints; the `changeMode` branch is gone. ✔
2. A scrape POST carrying `sessionId`/`ownerPassword` never mutates the referenced existing Postponement (acts as a fresh mint) — the params are no longer read from the body and are ignored; `match-post.spec.ts` asserts the referenced session is untouched and a fresh one is minted, plus wrong-password/missing-session cases still mint. ✔
3. Wizard step views no longer thread change-mode context through their links or renders — all four `*-get.tsx` handlers + step components stripped; `scrape-wizard.spec.ts` updated to assert no `sessionId`/`ownerPassword` hidden fields or edit-page back links. ✔
4. The shared change-mode helper (owner-password guard + change-suffix threading) is deleted — `change-utils.ts` removed, no references remain. ✔
5. Unit specs for the scrape wizard / final scrape handler updated to mint-only behaviour — `match-post.spec.ts` + `scrape-wizard.spec.ts` rewritten; 26/26 pass. ✔
6. `verify` gate (lint → test → build → e2e) green with coverage ≥ 80% — **lint PASS, unit PASS (579 tests), coverage ≥ 80% (Stmts 88.36 / Branch 80.25 / Funcs 92.09 / Lines 88.71), build PASS.** Full e2e NOT run to green: the repo's e2e suite still drives the removed manual-create path and is being converted to scrape-only by ticket 05 (running after this). By instruction, my gate is lint + test + build, all green. ⚠ e2e churn is ticket 05's scope, not a defect here.

No scope creep; no missing behavior.

## Summary

Standards: 0 findings (worst: none). Spec: 0 code findings (worst: criterion 6's e2e red is parallel churn owned by ticket 05). Clean, minimal, spec-faithful; mint-only behavior verified by unit specs. Note: unused locale keys (`change_match_details`, `create_new`, `create_postponement_title`, `change_via_scrape`, `save_changes`) remain defined in en/de.json — removal is owned by a later cleanup ticket (per the 04 review, ticket 06); left alone here to avoid cross-ticket churn.
