# Spec: Perspective-based invitation link labels

Status: ready-for-agent

## Problem Statement

The organizer of a Postponement sees two invitation links on the edit page labeled "Home team invitation link" and "Away team invitation link". These labels speak in match sides, not in the organizer's perspective:

- The organizer cannot tell at a glance which link belongs to their own team — they must remember which side they claimed when creating the Postponement.
- When the organizer claimed the guest side during creation (`organizerTeam` = away), the side-based labels are actively misleading: their own team's link says "Home team".
- Neither label shows the actual team name from the Match, so the organizer cannot tell which club each link invites without reading the URL.

## Solution

Relabel the two invitation links on the edit page from the organizer's perspective, following the `organizerTeam` field:

- The link for the organizer team reads: **"My team invitation link (<team name>)"**
- The link for the other side reads: **"Opponent team invitation link (<team name>)"**

The `<team name>` placeholder carries the actual Match side name (`homeTeam` / `guestTeam`). If a Postponement has no team names stored, the labels fall back to the same wording without the parenthetical. Both English and German locale files are updated; French and Italian keep reusing the English text per ADR-0016.

## User Stories

1. As an organizer who created a Postponement for my home team, I want my invitation link labeled "My team invitation link (<my team name>)", so that I immediately know which link to send to my own players.
2. As an organizer who created a Postponement for my home team, I want the other link labeled "Opponent team invitation link (<opponent team name>)", so that I send the right link to the opposing team's captain.
3. As an organizer who claimed the guest side of the Match ("Create as <team>" via the click-tt flow), I want the label perspective to follow `organizerTeam`, so that my own link says "My team" even though my side is technically the away side.
4. As an organizer, I want the actual team names shown inside the parentheses, so that I can verify at a glance which club each link invites without inspecting the URL.
5. As an organizer of a Postponement whose Match details carry no team names, I want the links to read cleanly as "My team invitation link" and "Opponent team invitation link", so that no broken or empty parentheses appear.
6. As a German-speaking organizer, I want the relabeled links in German ("Einladungslink für meine Mannschaft (<Mannschaftsname>)" / "Einladungslink für die Gegnermannschaft (<Mannschaftsname>)"), so that the UI stays consistent in my language.
7. As a French- or Italian-speaking organizer, I want the new English wording until dedicated translations land (ADR-0016), so that I never see stale side-based labels.
8. As a screen reader user, I want each link's accessible name to include its role ("My team" vs "Opponent") and team name, so that I can distinguish the two links without visual context.
9. As an opponent participant receiving a forwarded link, I benefit indirectly because the organizer sends the correct link more reliably.
10. As a developer, I want the locale keys renamed to perspective-based names, so that key names stay truthful once labels follow `organizerTeam` instead of fixed sides.
11. As a developer, I want the label selection logic isolated behind one small pure function over the Postponement, so that it can be unit tested without rendering.

## Implementation Decisions

- **Perspective mapping**: the link rendered for `session.organizerTeam` uses the "own team" label; the link for the opposite `Team` uses the "opponent" label. This was decided in grilling (option B): labels are perspective-correct rather than a blind rename of home→"My team", away→"Opponent", because sessions exist where `organizerTeam` is `'away'`.
- **Team name source**: the parenthetical name comes from the Match sides already stored on the Postponement (`homeTeam` / `guestTeam`). No schema change.
- **Missing-name fallback**: when the relevant side has no name, render the plain label without the parenthetical (grilling Q2 option b). No generic "(Home Team)" substitute.
- **Locale keys**: replace the side-named keys with four perspective-named keys — own/opponent label with `<%= it.teamName %>` interpolation, plus plain variants without interpolation. `TranslationKeys` derives from the English file, so the rename propagates type-safely. Old side-named keys are removed from both locales.
- **Final English strings** (typos from the original request corrected): "My team invitation link (<%= it.teamName %>)", "Opponent team invitation link (<%= it.teamName %>)", plus the two plain variants.
- **German strings** (as agreed in grilling): "Einladungslink für meine Mannschaft (<%= it.teamName %>)", "Einladungslink für die Gegnermannschaft (<%= it.teamName %>)", plus the two plain variants.
- **fr-CH / it-CH**: continue falling back to English text; no new locale files (ADR-0016).
- **Component change confined to the edit view**: the invite-links section computes both display texts from the session and assigns them to the home-side and away-side anchors. A single exported pure helper takes the Postponement and the translation function and returns `{home, away}` label strings — this helper is the one new seam.
- **List order unchanged**: the home-side row stays above the away-side row even when the organizer team is the away side. Reordering by perspective was not requested.
- No changes to join routes, tokens, or the clipboard buttons; only visible anchor text changes.

## Testing Decisions

- Good tests assert externally visible behavior — the rendered link text — not internal key names or component structure.
- **Unit**: test the pure label-selection helper directly: organizer on the home side, organizer on the away side (labels swap), missing team names (plain variants used), and interpolated names appearing verbatim. Use a stub translation function recording key + params, or the real English translations; prior art is the pure-function describe blocks in the edit handlers spec.
- **E2E**: extend the existing invitation-link happy-path spec to assert both anchors' visible text using the default fixture team names ("Home Team" / "Guest Team"). Existing href-based locators in the edit Page Object keep working untouched, since URLs are unchanged.

## Out of Scope

- Reordering the two list rows so "My team" always appears first.
- Any copy change beyond these two links (vote summaries, team sections, scrape wizard keep their existing wording).
- Dedicated fr-CH / it-CH translations.
- Changes to the join page, invitation tokens, or link structure.
- Showing opponent/own annotations anywhere except the two invitation links.

## Further Notes

- Grilling settled all decisions in one round; answers: perspective-correct labels (B), plain fallback without parentheses, corrected English strings, German wording as listed, key rename approved.
- Glossary note: the UI voice already uses perspective terms elsewhere ("Your Team Votes"); this change aligns the invitation links with that voice. `CONTEXT.md` needs no update — "organizer" and Match sides are already defined; no new term introduced.
- No ADR: trivially reversible copy/key change, no surprising trade-off.
