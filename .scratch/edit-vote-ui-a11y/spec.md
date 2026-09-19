# Edit & Vote surface UI/UX and accessibility rework

Status: ready-for-agent

## Problem Statement

A UI/UX and accessibility review of the edit page (rails the Organizer sees for the Proposed Dates) and the vote page (what a Participant sees) found five class of problems.

The edit rail, sorted by availability, collapses a business with few votes into one giant "Not playable" band: with `0/3` voted, 24 rows all show identical "Ostermundigen IV: 0 (0/0/0)" / "Grauholz: 3 (2/1/0)" tallies, with no chronological grouping to scan, and the generator and Players blocks are buried below the fold. Every row repeats the same bare accessible names — a screenreader hears "Delete", "Votable toggle", "Confirm Date" twenty-four times with no way to tell the rows apart, and the per-player vote dots carry their meaning only in a hover `title`, so keyboard and screenreader users get colour-only hints.

The vote page duplicates its heading (`Vote on Proposed Dates` as both the page `<h1>` and the article `<h2>`), repeats the same venue chip in the legend of all 18 fieldsets, uses radio inputs that fail the WCAG 2.5.8 target-size check, offers no way to submit without JavaScript, and spells the middle choice "if necessary" in lower-case next to title-cased "Yes"/"No". Its Vote Summary tallies right-align numbers without tabular numerals, so the columns jump when counts change.

Across both surfaces the type families diverge (the edit redesign uses the self-hosted Plex faces; the vote page falls back to the BeerCSS/Inter stack), the document never declares a `color-scheme`, and native controls can render dark scrollbars or inputs against a light theme on dark-mode OS. The review measured desktop a11y at 97 but flagged the duplicate headings, and the fragmented CSS is split across a 1100+ line monolith and a small token file.

## Solution

Make the two surfaces consistent, scannable, and operable for everyone:

- On the **edit rail**, every per-row control's accessible name carries its date; vote dots become non-visual-format-accessible; the availability sort keeps its ranked bands but long bands collapse behind a native disclosure so the full-strength dates come first without a wall of repeated tallies.
- On the **vote page**, the heading hierarchy no longer duplicates the title, dates group by week with the venue chip lifted into the group heading, the "Set all" controls stay within reach, the radio choices get properly-sized hit targets, the form submits without JavaScript, and the summary counts use tabular numerals.
- **Shared**: one type family across the app, an explicit `color-scheme`, a "Yes" / "If necessary" / "No" label convention, and the reuse of existing patterns (week grouping from the edit rail, `@layer design` tokens, native `<details>`, the accessibility-carrying tooltips already used elsewhere).

No domain model or storage changes: `Postponement`, the `PostponementRules` operations, the flags, and the Clash/Venue-Occupancy data are untouched. This is purely view and style.

## User Stories

1. As an Organizer, I want each proposed date's Delete and Votable controls to be announced with the date in their accessible name, so that a screenreader user can tell the rows apart instead of hearing "Delete" N times.
2. As an Organizer, I want the Confirm Date button to be announced with its date too, so that confirming is safe when rows are visually identical.
3. As an Organizer, I want the per-player vote dots on each date to be comprehensible without sight and without hover, so that I can read who voted from the accessibility tree.
4. As an Organizer, I want long availability bands (e.g. "Not playable (24)") to collapse behind a disclosure with a clear count, so that the full-strength and if-necessary dates are not buried under a wall of repeated zero tallies.
5. As an Organizer, I want the collapsed bands to remain expandable in place, so that I can always still inspect every date.
6. As an Organizer, I want the expanded/collapsed band to keep working when the rail re-renders after an HTMX mutation, so that my choice does not fight the swap.
7. As an Organizer, I want the tallies and counts on the edit rail to align numerically (tabular numerals), so that comparing availability across dates is fast and stable.
8. As an Organizer, I want the venue chip and the sort radio-group to be semantically labelled, so that assistive tech reports a proper group and legend.
9. As an Organizer, I want the generator and Players blocks to stay reachable without endless scrolling even when a postponement has many proposed dates.
10. As an Organizer (with many dates), I want the rail to keep the availability ranking — full strength first — so that the recommended dates stay on top.

11. As a Participant, I want the vote page not to repeat its own heading, so that the page title is announced once and the in-page heading adds information ("your availability").
12. As a Participant, I want the proposed dates grouped by week on the vote page, so that a long list scans like the edit rail.
13. As a Participant, I want the venue chip shown once per group when every date in the group shares the venue, so that the legend no longer repeats "(1) Turnhalle orange" on all 18 rows.
14. As a Participant, I want the Yes / If necessary / No choices to be equally tappable by touch and keyboard, so that I never miss a 13px radio target.
15. As a Participant, I want the "Set all" controls to stay within reach while I scroll down the list, so that I do not scroll back to the top to restore a default.
16. As a Participant, I want the form to save my votes even when JavaScript is unavailable, so that the fallback path is not broken by the HTMX enhancement.
17. As a Participant, I want the choice labels consistent ("If necessary" alongside "Yes"/"No"), so that the list reads coherently.
18. As a Participant, I want the Vote Summary counts to use tabular numerals aligned to the right, so that the column does not jitter as counts change.
19. As a Participant, I want my saved-vote confirmation to be announced (aria-live), so that a screenreader user knows the save happened.
20. As a Participant I want the same type family on the vote page as on the edit page, so that the app does not look like two different products.

21. As a screenreader user, I want one shared heading per section instead of duplicated H1/H2 text, so that the document outline is clean and the duplicated title is gone.
22. As a screenreader user, I want the vote-date radio groups' legends to be the date plus any clash/venue signal only, so that the announcement stays short and scannable.
23. As a screenreader user, I want the per-player vote dots to expose their meaning via accessible labels, not hover titles, so that I can audit votes.
24. As a keyboard user, I want every new interactive element (band disclosure, set-all, Save) to have a visible focus state consistent with the rest of the app.
25. As a user with reduced-motion preference, I want the new disclosures and any animation to respect `prefers-reduced-motion`, matching the existing tooltips and spinner.

26. As a dark-mode OS user, I want the document to declare its `color-scheme` so that native scrollbars, selects, and date-picker dialogs render correctly against the light theme, so that half-dark controls never appear.
27. As a maintainer, I want the shared type token applied app-wide instead of only to the edit redesign, so that one self-hosted family is the single source.
28. As a maintainer, I want the new styles to live in the existing `@layer design` token/style files with the established component sections, so that no new styling mechanism is introduced.
29. As a maintainer, I want all readable numbers to follow the tabular-numerals convention where a column is compared, so that the rule is applied consistently, not ad hoc.
30. As a maintainer, I want the accessibility and behaviour of these surfaces covered by the existing seams (render specs, e2e Page Objects, axe checks) rather than new test infrastructure, so that coverage stays in the current model.

## Implementation Decisions

- **No domain change.** `PostponementRules`, the `votable` / `opponentVotable` / `accepted` flags, the poll filters, and the tallies are untouched. Everything below is view rendering, browser behaviour wiring, or CSS. This keeps the seam at the render layer.
- **Accessible names carry the date.** A small shared helper (in the existing partials layer) composes each Proposed Date's display string into the control names. The edit rail's per-row Delete, Votable toggle, and Confirm Date use `"<control> · <date>"` (translated per locale); the date string is the same `shortDisplay`/`display` the row already computes, so the screenreader text never drifts from the visible card.
- **Vote dots become non-visual.** The per-player vote dots stop being plain `title`-carrying spans: the group is announced with `role="list"`/listitem semantics or an accessible label per dot of the form "`<player>: <vote value>`" (plus "no vote"), replacing the current title-only hint `voteTitle`. The visual dots and the numeric `voted/total` text stay as they are.
- **Availability bands collapse.** A band whose row count exceeds a threshold (6) renders its rows inside a native `<details>` whose `<summary>` is the band's existing heading (label + count); bands at or under the threshold render as today. The full-strength band stays open in the default render; a failed HTMX swap re-renders the rail and the disclosure state resets to the same default (choose by threshold, not by user memory, so partial swaps cannot strand a collapsed/expanded mismatch). The `Confirm Date`, `Delete`, and Votable controls keep living inside the disclosure so "not playable" dates can still be cleaned up without expanding everything.
- **Week grouping on the vote page.** The vote list is grouped by ISO week using the existing week-grouping behaviour shared with the edit rail, with the same `week-head` heading (label + range). When every date in a week group resolves to the same venue, the venue chip renders once in the group heading and is dropped from the per-date legends (keeping the visually-hidden full venue name for screenreaders); when venues differ within a group, each legend keeps its chip.
- **Vote heading hierarchy fixed.** The shared page `<h1>` keeps "Vote on Proposed Dates". The in-article heading becomes a distinct informant (a new "your availability" style heading) or is removed where it adds no signal, so the document no longer announces the same string at two levels. The section still carries a heading as the layout rule requires.
- **Radio hit targets.** The vote-page radio inputs get an explicit minimum target size (24px × 24px at the input, or the existing label padding is measured and kept) so the control passes the WCAG 2.5.8 target-size check; the edit rail's per-row checkbox and the sort radios get the same treatment. No new input styling mechanism — the custom `.radio` label pattern stays.
- **Set-all stays in reach.** The "Set all" fieldset on the vote page becomes sticky within the vote region while the list is long (below the header, above the first date) so Participants can re-bulk after scrolling; on short lists and reduced-motion it degrades to in-flow. The existing `aria-label` + tooltip wiring is kept.
- **No-JS submission.** The vote form gains a submit path that works without JavaScript (a `type="submit"` control that posts the raw radio form to the existing POST endpoint), while the JS users keep the current auto-save-on-change behaviour; the two never both fire outside a confirm step. The saved-toast and aria-live status are unchanged.
- **Label casing.** The middle vote choice renders as "If necessary" (capitalised) in locale labels, matching "Yes" / "No"; the underlying stored value `IfNecessary` is unchanged, so no data or domain migration.
- **Tabular numerals for tallies.** The vote summary table, the edit rail team tallies, and the voted-count use `font-variant-numeric: tabular-nums` with end alignment, extending the existing `.num` convention to every count column.
- **One font stack.** The self-hosted Plex faces declared in the token file become the plain text family for the whole app (shared layout, vote, join, start pages), not just the edit redesign; the condensed face stays scoped to the edit date cells. The BeerCSS/Inter fallback list remains as an exhausted fallback.
- **`color-scheme` declared.** The root document sets `color-scheme: light` (and `dark` handling strictly follows the existing single-light-theme constraint — the token set defines no dark palette, so the declaration prevents dark-native-control bleeding without inventing a theme). The theme-color meta is set once to the surface token.
- **Styles stay in the existing layer.** New rules go into the same `@layer design` component sections (edit rail / vote) as the current redesign; no new CSS file, no restructuring of the existing monolith (restructuring is out of scope, see below).
- **Localization.** New labels land in both en and de (fr-CH/it-CH reuse English per ADR-0016): per-row control names with date placeholders, "your availability" heading, collapse summary strings, and any set-all/status copy. Existing keys are not re-typed where a displayed string already exists (e.g. reuse the week-head and venue-chip keys).

## Testing Decisions

- **Test external behaviour, not implementation.** A good test asserts what a user or screenreader sees — accessible names, headings, buttons, counts, collapse state, and target geometry — never which helper function rendered it or which CSS selector was applied. It must fail on a wrong label, a missing tabular arrangement (assert via the accessibility/announcement surface or computed style at the browser level, not the token), or a broken no-JS submit, and survive a rename of internal helpers. Prior art: `vote-view.spec.tsx`, `proposed-dates-section.spec.tsx`, `edit-page.spec.tsx`.
- **Render seams stay the highest ones; no domain seam appears.** `PostponementRules` is untouched, so no `postponement.spec.ts` change is expected. The behaviour is asserted through the existing render/component seams (`VoteRegion`/`VotePage` render, `ProposedDatesRail` render, the sort-control partial render) plus the e2e surfaces.
- **Component render specs.** `vote-view.spec.tsx` covers: the weekly grouping boundaries (two dates in one week group vs across groups), the venue chip hoisting (same venue per group → one chip, mixed venues → chip per date), the singular heading (no duplicated title string at H1 and H2), the "If necessary" casing, and presence of the fallback submit control. `proposed-dates-section.spec.tsx` / `edit-page.spec.tsx` cover: per-row accessible names containing the date, the band collapse threshold (under → plain, over → `<details>`), band disclosure default-open for the top band, and the `aria-label`/`role` on the vote-dot group. Assert on the rendered fragment, matching the existing `toContain`-style render assertions — no JS DOM needed.
- **Browser-level checks for geometry and styling.** The number-alignment and target-size guarantees are asserted where computed styles are observable (a browser-project spec) using the existing headless-Chromium Vitest project: radio hit-target geometry ≥ the check threshold and `font-variant-numeric` applied to the tally cells. Prior art: the browser-project client specs already used by the repo.
- **E2E — what the user sees.** Extend the existing Page Objects (`JoinPage`, `EditPage`) rather than selectors: the vote page's week headings are visible, the venue chip appears once per homogeneous group, the duo of "Set all" and a working Save path (with JS on) saves and announces the toast, and the edit rail's long band is collapsible while the full-strength dates stay above it. Cover one likely error path: a no-JS (scripts-disabled) submission of the vote form persists the vote, per the "test likely error paths" rule. Prior art: `join-voting.e2e.ts`, `postponement-editing.e2e.ts`.
- **Accessibility checks.** The existing `checkA11y`/axe fixture runs on EditPage and JoinPage (desktop and the mobile viewport), asserting zero critical/serious violations including the target-size and heading-order rules; the axe findings from the review (duplicate headings already flagged as the page's 97-score gap) are the acceptance boundary. Prior art: the per-spec `checkA11y` convention in the e2e suite.
- **Keyboard + reduced motion.** `semantic-structure.e2e.ts` and/or `responsive.e2e.ts` cover the disclosure toggling by keyboard and that a reduced-motion preference does not animate the new disclosure; the existing `prefers-reduced-motion` e2e patterns apply.

## Out of Scope

- Any change to `PostponementRules`, the domain model, storage shape, poll filters, confirmation invariants, or the flags — the availability ranking, votable/accepted semantics, and clash behaviour stay exactly as they are.
- A dark theme. The `color-scheme` fix only prevents native controls from half-rendering dark; no dark palette or token set is added.
- Restructuring the CSS files (splitting the shared stylesheet is a maintenance concern, not a user-facing fix) — new rules simply follow the existing component sections in the same layer.
- Removing the vendor `transition: all` debt (it lives in the pinned upstream CSS, out of this product's files).
- Virtualization of large lists; current postponement sizes are below virtualizable thresholds and the collapse/wrapping changes already bound the render cost.
- Changing the iCal export, the opponent-captain page, the wizard, or the start page beyond the shared font/`color-scheme` consistency above.
- New account/password/CTA behaviour; the four-secret model and query-parameter capability pattern are untouched.

## Further Notes

- The P0s in this spec are the accessibility items (accessible names carrying dates, non-visual vote dots, single heading) and the target-size fix — a screenreader user's experience is the clearest acceptance signal on both pages.
- The P2s (font unification, color-scheme, tabular numerals) are small, low-risk, and reach every page, so they are cheap to fold in while the render layers are already being touched.
- The review that produced this spec was run live against `game-scheduler.localhost:3000` (desktop 1300×900 and mobile 390×844) with the existing fixture session `8cc273df-fa26-483e-b5fc-1c4910904e89`; Lighthouse snapshot scored Accessibility 97 / Best Practices 100 / SEO 83, with the heading duplication the main a11y deduction. The same fixture exercises a 24-date postponement, which is exactly the density that motivates the band collapse.
- The "Not playable (24)" case in the fixture shows 0/3 voted — the collapse exists precisely so that this real shape does not deaden the sort.