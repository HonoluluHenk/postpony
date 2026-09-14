# Vote page: Web Interface Guidelines fixes

**Status:** done

## Problem Statement

A Participant opens the invitation link on a phone to Vote on the Proposed Dates. On a 360px-wide screen the "Set all" row overflows the card and the "No" button is clipped, so the fastest way to answer is half-hidden. Every radio the Participant touches, and every arrow key a keyboard user presses inside a radio group, immediately reloads the whole page with no visible sign that anything is happening; nothing stops a second tap while the first save is still in flight. The radio labels are 24px tall, small for a thumb. Screen-reader users hear three buttons named only "Yes", "if necessary", "No" with no hint that they set every date at once, and the full Venue name is locked inside a `title` tooltip that neither touch nor keyboard can reach. The "Your votes have been saved!" toast is announced as an alert although it is a routine success. A Venue Occupancy of one reads "1 other games". Longer localized vote labels (German "notfalls") have no room to wrap and will overflow the same way.

## Solution

The vote page fits a 360px phone without horizontal clipping: the "Set all" buttons and the per-date radios wrap onto a second line when needed. Saving a Vote shows a pending state: the form's controls are disabled and the global spinner shows while the POST is in flight, and arrowing through a radio group with the keyboard saves once after the Participant settles, not once per keystroke. Radio hit targets meet the 44px touch size. Set-all buttons carry an accessible name that says what they do ("Set all: Yes"). The Venue chip exposes the full Venue name to assistive tech via visually-hidden text instead of a `title` tooltip. The saved toast is a polite status, not an alert. Venue Occupancy of one reads "1 other game". Everything else that already passes the guidelines stays as is.

## User Stories

1. As a Participant on a 360px phone, I want the "Set all" buttons fully visible, so that I can answer all dates with one tap.
2. As a Participant on a 360px phone, I want the Yes / if necessary / No radios of each Proposed Date to stay inside the card, so that no option is cut off.
3. As a German-speaking Participant on a phone, I want longer vote labels ("notfalls") to wrap rather than overflow, so that the layout holds in every locale.
4. As a Participant on a phone, I want each radio label to be at least 44px tall, so that I hit the option I aim for.
5. As a Participant, I want to see that my Vote is being saved (spinner, disabled controls) after I tap a radio, so that I do not tap again and wonder whether it worked.
6. As a Participant, I want a second tap during an in-flight save to be ignored, so that I never trigger two competing submissions.
7. As a keyboard user, I want to arrow through a date's Yes / if necessary / No options and have the page save once after I stop, so that I am not thrown into a reload on every keystroke.
8. As a keyboard user, I want focus to land back on the control I changed after the page reloads, so that I can continue to the next date without hunting.
9. As a screen-reader user, I want the set-all buttons announced as "Set all: Yes", "Set all: if necessary", "Set all: No", so that I know they act on every Proposed Date.
10. As a screen-reader user, I want the full Venue name announced with each Proposed Date, so that I know which hall the date is in without a mouse tooltip.
11. As a touch user, I want the full Venue name reachable (not only in a hover `title`), so that phones are not second-class.
12. As a screen-reader user, I want "Your votes have been saved!" announced politely as a status, so that it does not interrupt like an error.
13. As a Participant, I want a Venue Occupancy of one to read "1 other game", so that the text is correct English.
14. As a German-speaking Participant, I want the singular Venue Occupancy to read "1 weiteres Spiel", so that the German is correct.
15. As a Participant, I want the Vote Summary table and all existing behaviour (export link, saved toast, confirmed-state view) to keep working unchanged, so that the fix is invisible except where it helps.
16. As an Organizer reading the same Venue chip on the edit page, I want its accessible name unchanged in meaning, so that the shared partial does not regress the edit page.
17. As a developer, I want each layout fix guarded by an e2e assertion at the width where it broke, so that it does not regress silently.
18. As a developer, I want the a11y check (`checkA11y`) to pass on the vote page at phone and desktop widths, so that the page stays compliant.

## Implementation Decisions

- **Set-all row wraps.** The set-all button row drops its no-wrap behaviour and allows wrapping; buttons keep their current size. Guard: at 360px viewport the "No" set-all button is fully inside the viewport (bounding box right edge <= viewport width).
- **Vote radio group wraps.** The per-date radio row gains `flex-wrap: wrap`. Guard: at 360px viewport with `?lang=de-CH`, every radio label of the first Proposed Date is inside the viewport.
- **Radio hit target.** Radio labels inside the vote radio group get vertical padding so their box is at least 44px tall; the three options remain one row on desktop. Guard: bounding-box height of a vote radio label >= 44.
- **Pending state on auto-submit.** The auto-submit behaviour stays (no separate submit button; the server already casts only the dates present). The client-side vote form wiring, when it submits:
  - sets `aria-busy="true"` on the form and disables every set-all button and every radio in the form (native `disabled` on the fieldsets is not used, because disabled radios are dropped from the form body; the disabling happens after `form.submit()` is issued, or the values are read first, so the POST body is complete);
  - shows the existing global spinner (reuse the same mechanism the boosted links use);
  - ignores further set-all clicks and radio changes while a submit is pending (a module-level "pending" flag on the form, reset on `pageshow` so a back-navigation does not leave the page stuck).
- **Debounced keyboard change.** A radio `change` event schedules the submit after a short delay (about 400ms); a further `change` inside the same form within that window resets the timer. Set-all clicks submit immediately (and cancel any scheduled radio submit). The delay applies to all `change` events, so touch/mouse users see a barely perceptible pause; that is accepted over sniffing the input modality.
- **Focus restore after reload.** The submit path stores the changed radio's `name` + `value` (or the set-all button's value) in `sessionStorage` before submitting; on the reloaded vote page the client moves focus to that control with `preventScroll`, then clears the key. Feature is best-effort: if the control is missing (date deleted, status Confirmed) nothing happens.
- **Set-all accessible names.** Each set-all button gets an `aria-label` built from a new translation key that interpolates the vote label, e.g. "Set all: Yes". Visible text stays "Yes" / "if necessary" / "No". Vote label casing is not changed (decision: keep lower-case "if necessary").
- **Venue chip.** The shared Venue badge partial drops the `title` attribute. It renders the visible label as today, plus a visually-hidden span with the full Venue tooltip text ("1 – Turnhalle orange, UG, Schule Dennigkofen") when the full name differs from the visible label. The edit page uses the same partial and inherits the change.
- **Saved toast.** The "votes saved" toast uses `role="status"` instead of `role="alert"`.
- **Singular occupancy.** New key `venue_legend_occupancy_one` in both locale files ("1 other game" / "1 weiteres Spiel"), following the existing `venue_occupancy_line_one` precedent; the vote page picks the singular key when the count is exactly 1.
- **Viewport harness.** The named-viewport e2e helper gains a `phoneSmall` 360x740 entry; the existing `phone` 390 entry stays as is.
- **No change** to the vote POST handler, the Postponement domain module, the ADR-0013 player identity model, or the HTMX partial rendering (the vote form is `hx-boost="false"` and stays a plain POST).

## Testing Decisions

A good test asserts what the Participant or a screen reader perceives (role, name, visibility, bounding box inside viewport, focus location, announced status) and not class names or internal flags. Prefer `getByRole` / `getByLabel` over CSS selectors; the `.vote-radio-group` class already used by the Join Page Object is tolerated as existing prior art.

Seams (all existing):

1. **e2e via `JoinPage` Page Object + viewport helper** (prior art: `join-voting.e2e.ts`, `viewport-smoke.e2e.ts`, `focus-management.e2e.ts`): set-all "No" button fully visible at 360px; German radios inside viewport at 360px; radio label height >= 44; set-all buttons found by accessible name "Set all: Yes"; full Venue name present in the legend's accessible text; saved message has role `status`; after casting a Vote, focus is on the changed radio; a11y check at `phoneSmall` and `desktop`; singular "1 other game" rendered for a seeded Proposed Date with Venue Occupancy 1.
2. **Rendered-HTML view spec** (prior art: `vote-view.spec.tsx`): set-all `aria-label`s present; toast `role="status"`; no `title` on the Venue chip; visually-hidden full name present; singular key chosen for count 1, plural for 2.
3. **Browser unit spec for the client wiring** (prior art: existing `initVoteForm` tests in `ui.spec.js`): one radio change submits once after the debounce window; two changes within the window submit once; a set-all click submits immediately and cancels a pending timer; second click during pending is ignored; form gets `aria-busy` and controls disabled after submit; the focus key is written to `sessionStorage`.
4. **Translations spec** (prior art: `translations.spec.ts`): new keys exist in both locales with matching parameters.

Coverage stays >= 90% on all metrics; `npm run verify` must pass; existing screenshot baselines for the vote page are updated only where the wrap/padding changes them.

## Out of Scope

- Replacing the full-page reload with an HTMX partial swap for votes.
- An explicit "Save" button or a confirm step.
- Title Case for the vote labels ("If Necessary") in any locale.
- Header layout (`h1` row) on narrow widths; already stacks acceptably.
- Loading indication for the language `<select>` reload.
- Changes to the edit page beyond what it inherits through the shared Venue badge partial.
- The Vote Summary table (already compliant).

## Further Notes

- Findings originate from a Web Interface Guidelines review of the live vote page at desktop and 360px mobile emulation; the 390px `phone` viewport does not reproduce the set-all clipping, hence the extra `phoneSmall` entry.
- Disabling controls must happen after the POST body is captured: disabled radios are excluded from form submission and the server casts only the votes present in the body.
- The Venue badge partial is shared with the edit page; check its e2e/visual baselines after removing the `title`.
