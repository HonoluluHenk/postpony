# Review: 07-confirm-only-filled-button

Two-axis review of `46d458b..HEAD` (commit `a7bbd68` "ticket done: 07-confirm-only-filled-button"),
spec source: `.scratch/edit-page-responsive-redesign/issues/07-confirm-only-filled-button.md`
and `.scratch/edit-page-responsive-redesign/spec.md` (Phase 2).

## Standards

Per-file, the diff conforms to the repo's documented standards:

- **Typed, not stringly.** The new `copy_organizer_password` key is a `TranslationKeys`
  member (derived from `en.json`); `data-copy={props.organizerPassword}` and the
  `aria-label={props.t('copy_organizer_password')}` are typed through the props/`t`.
- **Localization sync.** `en.json` and `de.json` are updated in lockstep: the
  `copy_organizer_password` key is added to both ("Copy organizer password" /
  "Organisator-Passwort kopieren"), placed alphabetically before `copy_to_clipboard`.
  The `copied_to_clipboard` announcement is reused (not re-translated).
- **BeerCSS variants.** Delete uses `.button.outline`; Confirm Date uses `.button`
  (filled). Both are BeerCSS variants, no bespoke CSS added.
- **Clipboard behaviour reused.** The new button uses the established
  `clipboard-btn` + `data-copy` + `data-copied-label` contract driven by
  `initClipboard()` in `src/public/assets/js/ui.js`; the announcement targets the
  existing `#clipboard-status` element. No new JS.
- **Accessibility.** The icon-only copy button carries a descriptive `aria-label`
  and `type="button"`; it is keyboard focusable and gets the shared focus ring.
  The `checkA11y` fixture passes on the touched pages.
- **Tests not weakened.** The unit render specs add assertions (delete outlined,
  confirm filled, password copy payload); the e2e specs add a password-copy
  announcement test and keep the delete-dialog tests. Coverage gate holds
  (≥80% all metrics on full `npm run test`).
- **No new dependencies; deletion over addition.** 12 files changed; the password
  copy button reuses existing markup rather than a new component.

Baseline smells checked: no Mysterious Names, no Feature Envy, no Data Clumps, no
Primitive Obsession, no Repeated Switches, no Shotgun Surgery, no Speculative
Generality, no Middle Man.

Judgement call (not a violation): the clipboard-button markup is now repeated in
three places (two invite links + the password toast). The ticket explicitly says
"reuse the existing clipboard-button markup/behaviour", so a shared component was
not requested (YAGNI / "no abstractions that weren't explicitly requested"). The
repo's lazy-senior-dev rule endorses keeping it inline until a real need shows.

## Spec

Every acceptance criterion in the issue is implemented:

- **Delete outlined with icon + aria label** — the delete button is `.button.outline`,
  keeps the `delete` icon and its `aria-label`/`title`; a unit render spec asserts
  the outlined variant class.
- **Confirm Date the only filled button** — Confirm Date is changed to the filled
  `.button` variant; the votable switch is untouched. A unit render spec asserts
  Confirm Date is filled and delete is outlined on the row.
- **Password copy button** — the success toast now shows the existing `clipboard-btn`
  next to the password, with the password as `data-copy`, a `copied_to_clipboard`
  announcement, and a new translated `aria-label` (`copy_organizer_password`) in
  both `en.json` and `de.json`.
- **Unit render specs** — `proposed-dates-section.spec.tsx` (delete variant +
  confirm-filled) and `edit-page.spec.tsx` (password copy button present with the
  correct `data-copy` payload and aria label).
- **e2e** — a new `invitation-link.e2e.ts` test clicks the password copy button and
  asserts the "Copied to clipboard" announcement; the existing delete-dialog e2e
  tests pass (delete still works). Page object gains `organizerPasswordCopyButton`.
- **`checkA11y` + baselines** — the four edit-page screenshot baselines regenerated
  (confirm now filled, password copy button present); `checkA11y` passes.
- **`npm run verify` passes** — lint, unit tests (coverage ≥80%), build, and 108
  e2e tests all green.

Spec-alignment note (documented, not a defect): the issue box says "Votable switch
and Confirm Date button unchanged". In the worktree the Confirm Date button was
already rendered as `.button.outline` (no filled action on the row), so satisfying
the issue title — "Confirm Date is the only filled button" — required making it
filled. The button's behaviour (`hx-post` confirm), text, and the votable switch
are unchanged; only the visual variant changed to meet the explicit requirement.

No scope creep: the join page, create flow, start page, and the generator's weekday
grid (a separate ticket) are untouched; no new dependencies.

## Summary

Standards: 0 hard violations, 1 judgement call (inline clipboard-button repetition
is per the ticket's "reuse existing markup" instruction and the repo's lazy mode).
Spec: all acceptance criteria met; one documented deviation from the literal
"unchanged" wording that is required to satisfy the issue title.
