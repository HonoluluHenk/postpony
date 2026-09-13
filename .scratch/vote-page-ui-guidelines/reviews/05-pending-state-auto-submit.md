# Code review — 05-pending-state-auto-submit

Fixed point: `ba84712` (`5574307^`). Only commit reviewed: `5574307`.

## Standards

Reviewed against `AGENTS.md`, the `testing`, `htmx`, and `route-handlers` skills, and the Fowler smell baseline. No hard violations found.

- **No violation — plain POST preserved.** The vote form stays `hx-boost="false"` with no HTMX swap and no submit button; the wiring only calls `form.submit()` after the entry list is captured. (htmx skill; spec "No change to ... the HTMX partial rendering".)
- **No violation — disabling order.** `form.submit()` runs before the controls are disabled, and the unit test pins `disabledAtSubmit === false`, so changed radios cannot be dropped from the POST body. (Spec line 40; ticket criterion 2.)
- **No violation — one shared spinner instance.** `main.js` builds the `Spinner` once and passes it to both `initVoteForm` and `initHtmx`; the constructor only registers listeners and reads `#global-spinner` lazily, so building it before `load` is safe. No second instance, no double show/hide. (Spec line 41.)
- **Judgement call — Duplicated Code (minor).** The control selector `'button[data-set-all], .vote-radio-group input[type="radio"]'` appears twice in `initVoteForm` (the `pageshow` reset and the submit-disable loop). Extract it to one local constant so the two loops cannot drift. (Fowler: Duplicated Code → extract the shared shape.)
- **No violation — tests assert behaviour, not internals.** New `ui.spec.js` cases assert `aria-busy`, disabled state, spinner call, debounce timing, pending-ignore, and `pageshow` reset through the DOM; no class-name or private-flag assertions. Fake timers are already prior art in the same file. (testing skill.)
- **No violation — no weakened assertions.** The old immediate-submit test was replaced by an explicit debounce assertion (400 ms boundary), matching the new spec'd behaviour rather than relaxing it.

## Spec

Reviewed against `spec.md` (lines 39–43) and the ticket acceptance criteria. No findings.

- (a) Missing/partial: none. `aria-busy` + spinner (line 41), disable-after-submit (line 40), pending ignore (line 42), 400 ms debounce with timer reset, set-all immediate + cancel (line 43), and `pageshow` reset (line 42) are all implemented and covered. The single `submit(form)` path is the seam issue 06 hooks into; focus restore itself is correctly left to 06.
- (b) Scope creep: none. Changes are limited to `ui.js`, `main.js`, `ui.spec.js` and the ticket file. The `main.js` reorder is required to share the spinner instance, not a new feature.
- (c) Wrong-looking implementation: none. The `pageshow` reset re-enables only the vote controls (`button[data-set-all]` + `.vote-radio-group` radios), so it cannot clobber unrelated disabled controls; the shared single-form `timer`/`WeakSet` is named and bounded by a `ponytail:` comment.

## Summary

- Standards: 0 hard violations, 1 judgement-call smell (minor Duplicated Code selector).
- Spec: 0 findings.
- Worst issue per axis: Standards — the repeated control selector; Spec — none.
- Verdict: one minor fix applied in `review-fixed`.
