# Review: 06-restore-focus-after-save

Fixed point: `a97b9e4` (previous ticket). Diff: `git diff a97b9e4...HEAD`.
Commits: `0f75afc ticket done: 06-restore-focus-after-save`.

## Standards

No hard violations.

- `ui.js` `rememberVoteFocus` / `restoreVoteFocus` follow the existing JSDoc +
  `ponytail:`-comment style and keep storage access inside `try/catch`, matching
  the codebase's "best-effort enhancement, never throw" pattern.
- The storage payload `{name?, value}` is a small untyped JS object (JS files run
  with `disableTypeChecked`); it is a judgement-call data clump at most, and it
  travels no further than these two functions, so no change is warranted.
- Tests follow repo conventions: `sessionStorage.clear()` in `beforeEach` keeps
  the browser spec isolated; the e2e uses the `JoinPage` Page Object and asserts
  behaviour (`toBeFocused`, `scrollY`) rather than CSS.
- No tooling-enforced issue (lint/tsc/eslint all pass).

## Spec

No missing or partial requirements.

- Writes the changed radio's `name` + `value` (or the set-all button's `value`)
  to `sessionStorage` before `form.submit()` — `ui.js` `submit()` +
  `rememberVoteFocus()`, covered by three browser specs.
- On the reloaded vote page the client focuses that control with
  `preventScroll: true` and clears the key — `restoreVoteFocus()` on `pageshow`,
  covered by browser specs asserting `{preventScroll: true}` and key removal.
- Best-effort missing target: no throw, focus untouched, key cleared (spec `vote-deleted`).
- e2e covers the radio case, including a below-the-fold target and a
  `scrollY === 0` assertion that proves no scroll jump (`join-voting.e2e.ts`).
- The vote form stays a plain POST; no release handler or HTMX change.

No scope creep. The set-all-button focus case is covered at the browser level,
matching the ticket's "e2e covers the radio case".

## Summary

Standards: 0 findings (worst: none). Spec: 0 findings (worst: none).
