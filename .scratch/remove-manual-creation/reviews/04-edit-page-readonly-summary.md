# Code Review — 04-edit-page-readonly-summary

Fixed point: `27dc237..d3c5e08` (commit `d3c5e08 ticket done: 04-edit-page-readonly-summary`)
Spec: `.scratch/remove-manual-creation/spec.md` + ticket `04-edit-page-readonly-summary.md`

## Standards

No documented-standard violations found (judgement calls below).

- `src/routes/edit/id/edit.tsx`: removes the `change_match_details` `<a href="/create?sessionId=...">` action and adds a read-only `<p class="match-summary">` (a `<p>`, not a `<section>`/heading, so the semantic-structure heading rules are untouched). New optional props `homeTeam?` / `guestTeam?` / `matchDateTime?` with `?? ''` fallbacks.
- `src/routes/edit/id/edit-id-get.tsx`: passes `homeTeam`, `guestTeam`, `matchDateTime` (reusing the already-computed `originalMatchDateTime`) next to the pre-existing `proposedDateTime` prop. Consistent with the existing `WithRoutingURLSArgs`-style prop-passing in the handler.
- `src/locales/en.json` / `de.json`: one new `match_summary` key each, correctly using the `it.home`/`it.guest`/`it.datetime` interpolation convention and placed in alphabetical order (between `main_actions` and `missing_param`).
- `edit-page.spec.tsx` (new): unit spec asserting the read-only summary text and the absence of the change action. The `(key: any, params?: any)` / `renderToString(node: unknown)` casts are permitted in `.spec.ts` (`no-explicit-any`/`no-unsafe-*` relaxed there); `explicit-function-return-type` respected.
- `e2e-tests/pages/EditPage.ts`: adds `matchSummary` locator. The now-unused `changeMatchDetailsLink` getter is intentionally kept because `change the match via the wizard` (owned by ticket 05's e2e sweep) still references it.
- `e2e-tests/scraping-flow.e2e.ts`: adds a test driving the scrape wizard to a known match and asserting the read-only summary and the absence of both the change link and the "Find the match on click-tt.ch instead" affordance.

Smell baseline — judgement calls only, none actionable:
- **Data Clumps (mild)**: `homeTeam` + `guestTeam` + `matchDateTime` travel together into `EditPage`. Extraction into a `MatchReference` prop would be over-architecting a 2-file, single-use path; the lazy principle argues against it. Not a violation.
- **Optional props + `?? ''` (mild)**: the new props are optional with empty-string fallback, so a caller forgetting them would render an empty summary rather than an error. `edit-id-get.tsx` always supplies them, so this only guards against future misuse — acceptable, though `matchDateTime`/`homeTeam`/`guestTeam` could permissibly be required. Not blocking.
- `change_match_details` key remains defined in both locale files but is now unused on the edit page. That cleanup is explicitly owned by ticket 06; leaving it here is correct to avoid cross-ticket churn.

## Spec

Acceptance criteria:

1. Edit page renders the referenced Match (home vs guest, original date/time) read-only — `<p class="match-summary">{match_summary ...}</p>` next to `StatusChip`. The summary is plain text (no link/button), i.e. genuinely read-only. ✔
2. No "change match details" action or affordance on the edit page — the `<a href="/create?...">` link is removed entirely. ✔ (Also asserts no "Find the match on click-tt.ch instead" link, defending the surrounding scrape-only surface.)
3. Unit specs and e2e updated — `edit-page.spec.tsx` (new) + `scraping-flow.e2e.ts` test. Both assert the read-only summary is present and the change action is absent. ✔
4. `verify` gate (lint → test → build → e2e) green with coverage ≥ 80% — **lint PASS, unit tests PASS (581), coverage ≥ 80%, build PASS, e2e FAIL (64 of 89). Partial.** The e2e failures are all pre-existing parallel-work churn from tickets 01/02/03 (the manual `/create` path removed from the working tree/committed by ticket 02) — every failing test depends on `EditPage.createSession` / `CreatePage.create` / the change-match flow, all owned by ticket 05's e2e sweep. The new scrape-driven test added here passes. No e2e failure is attributable to this ticket. ⚠ blocked-by-parallel-work, not a code defect.

No scope creep: the added "no Find-the-match link" assertion and the `change_match_details` string-absence assertion both directly serve criterion 2. No missing behavior.

## Summary

Standards: 0 hard findings (worst: minor optional-props fallback). Spec: 0 code findings (worst: criterion 4 e2e red purely due to parallel tickets 01/02/03 churn, owned by ticket 05). Clean, minimal, spec-faithful; read-only summary + change-action removal verified by unit and scrape-driven e2e.
