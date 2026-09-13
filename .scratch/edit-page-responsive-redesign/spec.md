# Edit page: responsive fixes, structural cleanup, redesign prototype

**Status:** ready-for-agent

## Problem Statement

The Organizer opens the edit page on a phone or tablet after proposing a season's worth of Proposed Dates. On a tablet the date text of each Proposed Date is cut down to a single letter and the Clash / Venue Occupancy chips are clipped away. On a phone the own-team Votes table is cut off at the viewport edge, the copy-to-clipboard icon floats alone on its own line, the page heading fills most of the first screen, and the whole page runs to roughly 28,000px because every Proposed Date is listed four times (date card, own-team Votes, home tally, away tally). Every row shows three identical filled buttons, so the Organizer cannot tell at a glance which date to confirm or where the decisive action is.

## Solution

Every Proposed Date shows its full date, all of its Clash and Venue Occupancy chips, and its actions on every screen size. The three Vote tables fold into collapsed disclosures the Organizer opens on demand. Repeated text, boxed headings and the wall of identical filled buttons go; Confirm Date is the one filled action per row. The organizer password gets a copy button. The Proposed Dates Generator weekday grid fits a phone screen. Separately, a throwaway prototype explores a week-grouped, single-typeface redesign of the page so that a later redesign decision is made on a real render rather than a mockup.

## User Stories

1. As an Organizer on a tablet, I want the full Proposed Date text visible on every card, so that I know which date I am acting on.
2. As an Organizer on a tablet, I want every Clash and Venue Occupancy chip visible, so that no warning is silently clipped.
3. As an Organizer on a tablet, I want the date actions to wrap below the date rather than squeeze it, so that both stay usable.
4. As an Organizer on a phone, I want the own-team Votes table readable without horizontal cut-off, so that I can see who has voted.
5. As an Organizer on a phone, I want the copy-to-clipboard button to sit beside its invitation link, so that it reads as one control.
6. As an Organizer on a phone, I want the match summary line to stay inside the viewport, so that no text is cut.
7. As an Organizer on a phone, I want a compact page heading, so that the Proposed Dates appear near the top of the screen.
8. As an Organizer, I want the three Vote tables collapsed by default, so that the page stays short even with many Proposed Dates.
9. As an Organizer, I want to expand any Vote table with one tap or key press, so that vote detail is available on demand.
10. As an Organizer, I want each collapsed Vote table to show its heading in the disclosure summary, so that I know what I am opening.
11. As an Organizer, I want the Match summary line removed when it repeats the page heading, so that I read each fact once.
12. As an Organizer, I want the section headings to read as plain headings rather than boxed cards, so that the date cards are the only card level.
13. As an Organizer, I want the "Scheduling Engine Info" heading renamed to plain language, so that the section is named by what I see, not how it works.
14. As an Organizer, I want Confirm Date to be the only filled button on each Proposed Date row, so that the decisive action stands out.
15. As an Organizer, I want the delete button rendered as an outlined button, so that a destructive action does not compete visually with Confirm.
16. As an Organizer, I want a copy button next to the organizer password in the success message, so that saving it is one tap.
17. As an Organizer on a phone, I want the Proposed Dates Generator weekday grid laid out two days per row, so that it does not take a full screen of scrolling.
18. As an Organizer on a phone, I want the gap between the generator's date/venue fields and the weekday grid reduced, so that the form reads as one unit.
19. As an Organizer, I want the "Schedule checked, no clashes" and "Venue checked, no other games" chips to stay on every clean row, so that I can tell a checked date from an unchecked one.
20. As a keyboard user, I want disclosures, copy buttons and outlined buttons focusable with a visible focus ring, so that the page is operable without a mouse.
21. As a screen-reader user, I want the disclosure summaries and copy buttons labelled, so that WCAG 2.2 AA (ADR-0004) holds.
22. As a Participant using the German UI, I want every new or renamed label translated, so that the de-CH interface stays complete.
23. As a developer, I want end-to-end assertions at phone, tablet and desktop widths, so that these layout regressions stay caught.
24. As a developer, I want the e2e screenshot baselines regenerated once per visual change, so that the visual tests reflect the new layout.
25. As a developer, I want a prototype of the redesign switchable via a URL search param on the edit route, so that variants can be compared on real Postponement data.
26. As a developer, I want the prototype on a throwaway branch that never merges, so that main keeps only validated decisions.
27. As a developer, I want the prototype verdict recorded in this spec's comments, so that the next spec can build on it.

## Implementation Decisions

### Phase 1 — responsive bug fixes (CSS plus one markup change)

- The Proposed Date card loses its fixed height in favour of a minimum height, and the details row no longer hides overflow, so chips are never clipped.
- The date text inside a Proposed Date card no longer uses nowrap/ellipsis truncation or a hard max width; it wraps naturally.
- The card-wrapping media query that currently applies below the phone breakpoint is widened to apply below the BeerCSS medium breakpoint (below 993px), so actions wrap under the date on tablets.
- The own-team Votes table gains per-cell data labels so that the existing stacked-table pattern for narrow screens applies to it as it already does to the home/away tallies.
- The match summary paragraph gets overflow wrapping (interim; deleted in Phase 2).
- The invitation link row does not wrap, the link may shrink, and the clipboard button idle opacity rises so it reads as a control.
- The h1 size token becomes a clamp between a phone size and the current desktop size; the language selector stays in the header row on phones.

### Phase 2 — structural cleanup

- Each of the three Vote tables (own team, home tally, away tally) is wrapped in a native disclosure element, closed by default; the existing heading moves into the disclosure summary so the heading hierarchy is preserved.
- The match summary paragraph is deleted; the status chip remains.
- Section headings lose their boxed background; only the Proposed Date cards remain as cards.
- The "Scheduling Engine Info" heading key is renamed to plain language ("Schedule" / "Spielplan") in both locale files.
- The delete Proposed Date button becomes the outlined button variant with its icon; the votable switch and the filled Confirm Date button are unchanged.
- The success message reuses the existing clipboard button next to the organizer password.
- The Proposed Dates Generator weekday grid becomes a two-column layout under the phone breakpoint; the spacing below the from/to/venue controls shrinks to the standard spacing token.
- Clean-row check chips remain on every row.

### Phase 3 — redesign prototype (prototype skill, UI branch)

- Lives on branch `proto/edit-redesign`, is never merged, and is switchable via a `proto` search param (variants `a` and `b`) on the edit route, plus a floating bottom bar.
- Typography: one family, two widths, self-hosted in the vendor fonts directory: IBM Plex Sans for body and Plex Sans Condensed with tabular numerals for the date column. No all-caps labels, no eyebrows.
- Palette: cool paper background, a light line colour, near-black ink, plus the existing indigo primary, error and warning tokens. No new accent.
- Layout: dates grouped by ISO week with week dividers (a real sequence); left-aligned throughout; single-line header; desktop has a sticky sidebar holding status, invitation links, roster and generator; phone stacks with votes and roster in disclosures.
- Votes shown inline per Proposed Date as per-player dots, replacing the tables (prototype only; Phase 2 keeps disclosures on main).
- No tests, no persistence changes, no polish; the verdict and the question it settled are recorded under this spec's Comments.

### Process

- One commit per fix, conventional commit messages.
- Phases 1 and 2 land on a feature branch; Phase 3 on its own throwaway branch.

## Testing Decisions

- A good test asserts what the Organizer sees: an element is visible, its text is complete, its bounding box lies inside the viewport, a disclosure opens on click. Tests never assert CSS property values.
- **End-to-end (Playwright, highest seam).** The postponement-editing spec gains viewport-parameterised checks at 390px, 820px and 1282px: full Proposed Date text visible, all chips visible, own-team Votes rows readable, copy button on the same line as its link. Tally assertions open the disclosure first. Each new state runs the accessibility check. Screenshot baselines are regenerated. Prior art: the existing `edit-with-dates` / `edit-with-votes` screenshot tests and the join-voting e2e.
- **Unit (Vitest JSX render specs).** Own-team Votes: cells carry data labels. Edit page: disclosure/summary wrap each vote heading, no match summary paragraph, password copy button present, renamed heading. Proposed Dates section: delete button carries the outlined variant. Prior art: the existing edit-page, own-team-votes and proposed-dates-section render specs.
- Coverage stays at or above 80% for all metrics.
- The prototype is untested by design.

## Out of Scope

- Join page, create flow, start page.
- Merging vote counts into the Proposed Date cards on main.
- Hiding check chips on clean rows.
- Any prototype code, font files or palette changes on main.
- New runtime dependencies.

## Further Notes

- The prototype verdict may spawn a follow-up spec for the actual redesign; this spec ends with the verdict recorded, not with the redesign shipped.
- Bug root causes observed: fixed card height plus hidden overflow on the details row; nowrap/ellipsis with a 12.5rem cap on the date text; missing data labels on the own-team Votes table so the narrow-screen stacking pattern did not apply; wrapping allowed on the invitation link row.

## Comments

### Prototype verdict (ticket 09)

**Question settled:** Does a week-grouped date rail with inline per-player vote dots, a single Plex type family and a sticky desktop sidebar beat the current layout?

**Answer: Yes.** Variant A (week-grouped rail + sticky sidebar + inline vote dots + single Plex family) is the stronger direction and should be the basis of a real redesign. It removes the ~28,000px page (every date listed four times) entirely. **Steal from B:** the dense one-line row (A's date cell wraps awkwardly on phone — `2026` drops to its own line) and meta-on-top for narrow screens. **Before shipping:** phone roster/generator should be collapsed `<details>`; confirm the chip set on a row with real clashes (prototype data had clean rows); keep the icon-only copy button (B's full-text label is verbose). Screenshots: `prototype-screenshots/a-{390,820,1282}.png`, `b-{390,820,1282}.png`; full write-up in `VERDICT.md`. Prototype lives on throwaway branch `proto/edit-redesign` (never merged).
