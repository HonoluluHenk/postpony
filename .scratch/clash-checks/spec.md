# Spec: Schedule Clash Checks on Proposed Dates

Status: ready-for-agent

## Problem Statement

When a match is postponed, the owner proposes candidate new dates. Neither the owner nor the voting participants know whether the home or away team already has a scheduled game at a proposed date/time — the hall may be booked, a team may be double-booked. The answer exists on click-tt.ch, but nobody checks it, so dates are proposed and voted on blind.

## Solution

Whenever proposed dates are created or added, scrape both teams' click-tt schedules once, compute per-date Clashes (a scheduled game whose start falls within the proposed range plus a two-hour buffer on either side), and persist them on the Proposed Date. Each clashing date shows one line per affected team ("Home: game 17:00 vs X") on both the owner edit page and the participant vote page; a clean check shows "checked, no clashes". Hand-entered matches show "not checked". The owner can manually refresh the snapshot. Confirming a clashing date warns but does not block.

## User Stories

1. As an owner, I want both teams' schedules checked against every date when I generate a weekly slate, so that I can see Clashes immediately.
2. As an owner, I want the schedules re-checked when I add a single proposed date later, so that new dates are never checked blind.
3. As an owner, I want each clashing proposed date to show one line per affected team with the game's time and opponent, so that I can judge whether the date works.
4. As an owner, I want all Clashes listed, not just the first, so that I can see how many games collide at a proposed date.
5. As an owner, I want the postponed match itself excluded from the Clash results, so that I am not warned about the very game I am rescheduling.
6. As a participant, I want the same Clash info on the vote page, so that I can vote with full information.
7. As an owner, I want a manual "refresh schedule check" action on the edit page, so that I can update a stale snapshot when click-tt changes.
8. As an owner, I want to confirm a clashing date with a warning, so that the feature informs without trapping me when click-tt is stale.
9. As an owner of a hand-entered match, I want a "not checked" hint instead of fabricated data, so that I am not misled.
10. As a user, I want the pages to still render without Clash info when click-tt is unreachable or a scrape fails, so that the app degrades gracefully.
11. As an owner, I want a "checked, no clashes" state when a check ran clean, so that I know the check actually happened.
12. As a participant, I want the Clash data I see to match what the owner saw, so that we all decide on the same snapshot.
13. As an owner creating a match by scraping, I want both teams' click-tt identities retained at creation, so that the schedule check is possible at all.

## Implementation Decisions

- **Persist click-tt team identities.** Both teams' `(championship, group, teamtable)` are stored in typed fields on the Postponement when the match is created via the scrape wizard (the wizard already holds both in hand — it scrapes the opponent roster). Hand-entered matches have none. See ADR-0022.
- **One new seam: a pure `computeClashes` domain module.** Takes the proposed dates, both team schedules, and the original match; returns per-Proposed Date results `{home: Clash[], away: Clash[]}`. All decision logic lives here: the overlap rule, the original-match exclusion, the per-team split. A `Clash` is `{opponent, start}` with `start` normalized to ISO via `parseClickTtDateTime` — raw click-tt strings never leak into the model.
- **Overlap rule.** A game clashes when its start falls within `[proposedStart − 2h, proposedEnd + 2h]`. The two-hour buffer is a named constant, one place to tune.
- **Original-match exclusion.** Before evaluation, the postponed match (identity: same date plus home/guest names) is filtered from both schedules.
- **Wiring.** The edit-page proposed-dates handler fetches each team's schedule once per check, evaluates all dates, and attaches the results to the session before saving — in all three paths: single add, generator run, manual refresh. The check runs client-side never; it is a server-side step after dates change.
- **Rendering.** Per-Proposed Date rows on the edit page and the vote page show one line per affected team with localized time and opponent; "checked, no clashes" when a check ran clean; "not checked" for hand-entered matches; nothing when a scrape failed.
- **Confirm flow.** Confirming a clashing date shows a warning inline; confirmation is still allowed.
- **Backwards compatibility.** Clash data is an optional property of a Proposed Date; existing stored sessions render exactly as today, and new sessions without a successful check carry no clash data.

## Testing Decisions

- A good test asserts external behavior: given schedules and proposed dates, the clash sets per date are exactly right — no mocks of the network, fixture HTML only at the scraper seam.
- **Unit — `computeClashes` spec (new):** boundary cases at exactly ±2h (in) and just outside (out), per-team split, the same game appearing in both schedules, original-match exclusion, multiple clashes on one date, empty schedules, hand-entered-style empty identity input.
- **Handler specs — existing `edit-handlers.spec.ts` pattern:** single add, generator run, and refresh attach the right clash data to the stored session; a failed scrape leaves none; the session save happens once.
- **Creation spec — existing `match-post.spec.ts`:** both teamtables persisted in typed fields.
- **E2E — `scraping-flow.e2e.ts` pattern:** happy path (scrape a match → propose dates → clash lines visible on edit and vote pages); hand-entered path shows "not checked".
- Prior art: `postponement.spec.ts` (pure domain), `edit-handlers.spec.ts` (handler + store), `scrape-wizard.spec.ts` (fixture-backed handlers), `scraping-flow.e2e.ts` (full flow).

## Out of Scope

- Blocking confirmation of clashing dates.
- Live per-view scraping or TTL auto-refresh (snapshot staleness is accepted; the manual refresh covers it).
- Showing full team schedules — only Clashes are shown.
- Re-resolving teamtables by display name at check time.
- Any clash support for hand-entered matches beyond the "not checked" hint.
- A caching layer for scraped schedules.
- Clash display in the create wizard (no proposed dates exist there yet).

## Further Notes

- The two-hour buffer is a guess until real use; it lives as one named constant.
- Scraper fixture staleness (a new season, changed click-tt layout) is handled by the existing `update-test-fixtures` skill.
- The domain term "Clash" is recorded in `CONTEXT.md`; ADR-0022 records the team-identity persistence decision.