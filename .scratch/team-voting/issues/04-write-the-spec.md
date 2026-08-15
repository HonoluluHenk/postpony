# Write the two-phase team-voting spec

Status: closed Label: wayfinder:task Parent: map.md Blocked by: issues/01-own-team-completion-signal.md, issues/02-opponent-pre-proposal-experience.md, issues/03-status-semantics.md

## Question

Write `spec.md` in this directory (`.scratch/team-voting/spec.md`) synthesizing the map's locked charting decisions plus the resolutions of tickets 01–03 into a spec ready to hand off for implementation.

## Notes

- Task, AFK once 01–03 are closed: the decisions are the inputs, the spec is assembly.
- Follow the tracker convention: spec lives at `.scratch/<feature-slug>/spec.md`.
- The spec covers: scrape team-pick (two buttons per match), `organizerTeam` /
  `votableByOpponent` / `confirmedProposedDateId` / `reopenCount` model changes and migration, edit-view per-player votes + propose + confirm + reopen, vote-page results section, confirmed-info invite view, status mapping from ticket 03.
- Gate: every decision referenced in the map must be reflected; no new decisions invented here.

## Comments

Resolved 2026-08-15: wrote `spec.md` in this directory — see the **Implementation spec**. It assembles the map's locked charting decisions plus the resolutions of tickets 01–03: model changes and read-time migration, status lifecycle, domain operations, scrape team-pick, registration/confirmed-view rules, edit-view and vote-page changes, locale keys, docs ripple, and testing. Only map "Not yet specified" fog (exact wording) remains open, flagged in the spec's Fog section.
