# Spec: One select button per scraped match row

Status: ready-for-agent

## Problem Statement

An organizer creating a Postponement from a scraped click-tt.ch Match already picked their own club team one wizard step earlier. Yet on the match-list step every Match row forces them to choose again between two buttons — "Create as <home team>" and "Create as <guest team>" — even though only one of the two names is their own team. The redundant choice adds noise to every row of a 14-row schedule table and implies a decision (which side am I?) that was already made when they picked their team.

## Solution

Each Match row shows a single "Select" button. The organizer's side (`organizerTeam`) is derived automatically: the wizard knows the chosen team from the previous step and threads it through the form, so the handler compares the submitted team name against the row's home and guest teams. One click selects the match; the Postponement is created in Draft with the correct `organizerTeam`, rosters, and original Match date, exactly as before.

## User Stories

1. As an organizer, I want one button per scraped Match row, so that selecting a match takes one click instead of parsing two nearly identical labels.
2. As an organizer, I want my team choice from the previous wizard step to carry forward, so that I never state which side I manage twice.
3. As an organizer, I want the system to infer whether my team plays at home or as guest, so that I don't have to know or care about the home/guest bookkeeping.
4. As an organizer, I want the resulting Postponement's `organizerTeam` to be correct whether my team is listed as home or as guest, so that voting tallies and rosters land on the right sides.
5. As an organizer whose team appears in the schedule both as home and as guest across the season, I want every row selectable the same way, so that first-leg and return-leg postponements behave identically.
6. As an organizer re-scraping an existing Postponement via the wizard's change mode, I want the same single-click selection, so that changing the Match feels like creating one.
7. As an organizer who picked the opponent's club team at the teams step (because I organize on their behalf), I want the derived side to follow that choice, so that the tool doesn't presume which club I represent.
8. As a German-speaking organizer, I want the button labelled "Auswählen", so that the interface stays in my language.
9. As an English-speaking organizer, I want the button labelled "Select", so that the wording matches the rest of the wizard.
10. As a French- or Italian-speaking organizer, I want a sensible label rather than broken keys, so that the fallback locales stay coherent.
11. As a screen-reader user, I want the action column to keep its accessible header and each row to expose exactly one button, so that navigating the schedule table stays predictable.
12. As a keyboard user, I want the Select buttons reachable in tab order, so that I can drive the whole wizard without a mouse.
13. As an organizer submitting the form directly (or a malicious client), I want a missing team name rejected rather than silently defaulted, so that no Postponement is ever stored with the wrong `organizerTeam`.
14. As a maintainer, I want the dead per-side translation keys removed, so that the locale files don't advertise UI that no longer exists.
15. As a maintainer, I want both derivations (team-is-home, team-is-guest) covered at the handler seam, so that the inference logic cannot regress silently.
16. As a maintainer, I want the browser-level flow to assert one button per row, so that a future edit reintroducing per-side buttons fails loudly.
17. As an invited Participant joining later via the invitation link, I want nothing about my join flow to change, so that existing links keep working.
18. As an organizer, I want the empty-state message preserved when my team has no matches, so that the table-less page still explains itself.

## Implementation Decisions

- The match-list step renders exactly one submit button per Match row, replacing the pair of per-side claim buttons.
- The organizer's chosen team travels with each row's form as a hidden field alongside the existing match fields; the button itself carries no value.
- The create-from-scrape handler derives `organizerTeam` by comparing the submitted team name to the row's home and guest team names ('home' on match, otherwise 'away'). This comparison already existed implicitly; it becomes the single source of truth.
- The submitted team name becomes a required, non-empty validated field. The previous optional-with-silent-away-fallback behavior is removed — a missing team name is a validation failure surfaced through the standard missing-parameter error path.
- Change mode (re-scrape from the edit page) uses the same derivation; the stored session keeps its identity, passwords, votes, and Proposed Dates while rosters and `organizerTeam` are replaced, matching the existing re-scrape contract.
- The two per-side translation keys are removed from all locale files and replaced by a single generic key ("Select" / "Auswählen"); fr-CH and it-CH continue falling back to English per ADR-0016.
- No model, store, or route changes: `Postponement`, its Status lifecycle, and the dual-password security model are untouched. The domain glossary needs no update — `organizerTeam` ("the side the organizer manages") already describes derived state, not a user-entered choice.

## Testing Decisions

- Good tests here assert external behavior only: rendered HTML shape (one submit button per row, the hidden team field present with the chosen team) and the POST contract (stored `organizerTeam`, rosters, redirect), never internal helpers or markup cosmetics.
- Handler seam, unit level: drive the create-from-scrape POST handler through the established minimal mock App context. Cover both derivations (chosen team is home side / guest side), the required-field rejection when the team name is absent, and change-mode preservation of session id, passwords, votes, and Proposed Dates. Prior art: the existing match-create POST unit spec.
- Render seam, unit level: assert the match-list HTML contains one submit button per row and threads the chosen team into every form, including change-mode context threading. Prior art: the scraper wizard rendering spec's match-list tests (button-count and hidden-input-count assertions over returned HTML).
- Browser seam, end-to-end: the scraping-flow suite updates to expect a single "Select" button per row and exercises both legs of the derby fixture — guest-side selection yielding 'away' and return-match selection yielding 'home' — plus the re-scrape change-mode journey. Prior art: the existing scraping-flow e2e with fixture-served click-tt responses and the ScrapePage page object.
- Coverage must stay ≥ 80%; the removed keys should show up as deletions, not uncovered branches.

## Out of Scope

- Whole-row clickability or any client-side JS enhancement of the table.
- An escape hatch for explicitly claiming the opposite side — rejected during design: whoever organizes picks the corresponding club team one step earlier; opponents participate via invitation link.
- The manual (non-scraped) creation path and its forms.
- Join/invitation flow, voting, proposed dates, reopen — all downstream features are untouched.
- New translations beyond the en/de pair for the new key.

## Further Notes

- Decisions settled in a grilling round with the maintainer (single button, generic key, no escape hatch, required team field, both-side test coverage) and confirmed with "all ok".
- No ADR warranted: easily reversible, unsurprising to a future reader, no genuine trade-off — the dual buttons were redundant from day one (both locale keys rendered identical text).
- Implementation state at spec time: view component and locale files updated; handler validation, unit specs, page object, and e2e updates remain.
