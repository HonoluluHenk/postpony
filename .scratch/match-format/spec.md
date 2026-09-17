# Match Format & the availability ranking of Proposed Dates

Status: ready-for-agent

## Problem Statement

The `Availability` sort of Proposed Dates ranks each date purely by raw headcount — `Available: N`, the number of the viewing captain's own players who voted `Yes` or `IfNecessary` — and groups equal counts under that number. The app has no idea how many players a match actually needs, so the ranking cannot say what an organizer really wants to know: is this date *playable at full strength*, *playable if people come through*, *playable only short-handed*, or *not playable at all*? A captain has to mentally compare each count against an implicit threshold, and a date the organizer closed for a Clash still appears under a healthy count as if it were a safe pick.

## Solution

Introduce a **Match Format** — how many players a side must field for the match: a full-strength `maxPlayers` and a reduced-strength `minPlayers` floor, under a profile `name`. Every new Postponement is assigned the default format; existing postponements get it at read time. The availability sort then partitions the votable Proposed Dates into four cascading groups — **Full strength**, **With if-necessary**, **Reduced strength**, **Not playable** — each headed by a fixed translated label and a date count, and each ordered so the most playable dates come first. Non-votable dates always land in **Not playable**, whatever their tally. The format is purely a ranking aid: it changes nothing about confirming, voting, or editing.

## User Stories

1. As an organizer, I want the app to know how many players my team needs for this match, so that the availability ranking reflects what "enough players" actually means.
2. As an organizer, I want a full-strength size and a smaller "still playable" size, so that a date short of full strength is not ranked the same as a date with nobody available.
3. As an organizer, I want every new postponement to come with the default format, so that I get useful ranking without configuring anything.
4. As an organizer, I want the format to describe a per-side requirement, so that I am comparing my own team's availability against my own team's needs.
5. As an organizer, I want dates everyone has firmly confirmed (`Yes`) to rank in **Full strength**, so that certain dates are unambiguously at the top.
6. As an organizer, I want a date to reach **Full strength** only on firm `Yes` votes, so that "maybe if needed" cannot masquerade as certainty.
7. As an organizer, I want a date that reaches full strength only by counting `IfNecessary` votes to rank next, in **With if-necessary**, so that contingent availability is visible but clearly second.
8. As an organizer, I want a date that can field at least the reduced-strength floor but not full strength to rank in **Reduced strength**, so that short-handed options are kept, below full options.
9. As an organizer, I want a date that cannot reach even the reduced-strength floor to rank in **Not playable**, so that impossible dates sink to the bottom.
10. As an organizer, I want every non-votable date to rank in **Not playable** regardless of its tally, so that a date I closed (or a clash auto-deselected) is never presented as a safe pick.
11. As an organizer, I want the groups to be exhaustive and mutually exclusive, so that every proposed date appears exactly once.
12. As an organizer, I want the groups to cascade — each filling from what the previous groups left — so that a date already claimed by a stronger group is never repeated lower down.
13. As an organizer, I want **Full strength** ordered by firm `Yes` count, then `IfNecessary` count, then start time, so that the strongest and soonest dates come first.
14. As an organizer, I want the other three groups ordered by total availability, then start time, so that within a playability band the more-staffed, sooner dates lead.
15. As an organizer, I want every group header to be a stable English/German label with the number of dates in it, so that I can read the ranking at a glance without decoding raw counts.
16. As an organizer, I want empty groups to be dropped, so that the rail shows only the bands that actually contain dates.
17. As an organizer, I want the availability ranking on my edit page, so that I can judge candidate dates against my own team's turnout.
18. As an organizer, I want the ranking to replace the current plain count grouping, so that there is one availability sort, not two competing ones.
19. As an organizer, I want the plain `Date` sort to keep its weekly grouping untouched, so that I can still browse chronologically.
20. As an organizer, I want a mutation (adding a player, toggling a date, confirming) to preserve the sort I had chosen, so that my view does not jump.
21. As an organizer, I want all proposed dates to keep rendering in every sort, so that closing a date hides it from the polls but never from my management view.
22. As an organizer, I want the format to change nothing about what I can confirm, add, or edit, so that it stays an advisory ranking.

23. As an opponent captain, I want the same availability ranking on my page scoped to my own team's votes, so that I judge dates by my side's turnout, not the organizer's.
24. As an opponent captain, I want the group vocabulary to match the organizer's, so that both captains read the same words.
25. As an opponent captain, I want to see only dates still in my poll, exactly as today, so that the ranking never resurrects a date my team cannot vote on.

26. As a screenreader user, I want each group announced with its label and date count, so that I can navigate the ranked list by playability band.
27. As a screenreader user, I want the group headers to be a sensible part of the list's structure, so that the ranking is not conveyed by colour or position alone.
28. As a screenreader user, I want each date to remain individually addressable within its group, so that a group heading does not swallow the dates under it.

29. As a German-speaking captain, I want the four headers in German — "Volle Stärke", "Mit Notfall", "Reduzierte Stärke", "Nicht spielbar" — so that the ranking reads in my language.
30. As a captain in fr-CH or it-CH, I want the English labels per ADR-0016, so that the fallback stays consistent.

31. As an organizer with existing postponements, I want those sessions to gain the default format on read, so that the ranking works before I ever configure anything.
32. As an organizer with existing postponements, I want the upgrade to rewrite nothing in storage, so that rolling the change back stays trivial.
33. As an organizer with existing postponements, I want sessions that never had a format to behave exactly like new ones, so that the ranking is consistent across old and new.

34. As a maintainer, I want the format's `name` stored but unused, so that named profiles (e.g. a 3-player vs a 2-player format) can arrive later without a schema change.
35. As a maintainer, I want the ranking formula in the domain module rather than the view layer, so that both captain pages share one tested implementation.
36. As a maintainer, I want the default format declared in one place, so that the value the domain applies and the value the ranking reads cannot drift.
37. As a maintainer, I want the read-time default covered by the existing normalization tests, so that legacy rows stay a supported input.
38. As a maintainer, I want the domain glossary to name "Match Format" and an ADR to record the decision, so that code, UI, and docs speak one vocabulary and the trade-offs are preserved.

## Implementation Decisions

- **Match Format shape.** A `MatchFormat` is `{ name: string; minPlayers: number; maxPlayers: number }`. `maxPlayers` is full strength, `minPlayers` the smallest side that can still play. A single exported default carries the value every new Postponement gets: `{ name: 'STT Mannschaft', minPlayers: 2, maxPlayers: 3 }`. `name` is stored only; nothing in the UI reads it yet.
- **Persisted per Postponement.** The `Postponement` model gains a required `matchFormat`. It is not yet a field of the creation input; `PostponementRules.create` assigns the default directly, so the hardcoding lives in one place.
- **Read-time upgrade only.** The session-store normalization gives rows without a `matchFormat` the default, matching the existing read-time normalization seam. Nothing is rewritten in storage.
- **Fixture builders in lockstep.** The deep-partial `aSession` builder gains the default format, since its spec asserts every required field is present and builder drift otherwise breaks compilation across consumers.
- **Counting rule.** For a side, `definitive = Yes` count and `availability = Yes + IfNecessary` count, taken from the viewing captain's own team. This preserves the established meaning of `IfNecessary` ("I'll make it work if needed") while reserving the top group for firm votes.
- **One new pure operation on the domain class.** `PostponementRules` gains a method that, for a session and a team, computes the four cascading groups. It returns an ordered list of groups, each carrying its **kind** and its dates in ranked order; group kinds are a closed union — `'fullStrength' | 'withIfNecessary' | 'reducedStrength' | 'notPlayable'`. Keeping the formula here is the single new seam; both captain pages consume it.
- **Cascade semantics.** Working over the votable Proposed Dates and in this order, each group claims only what earlier groups left:
    1. **Full strength** — `yes >= maxPlayers`.
    2. **With if-necessary** — `availability >= maxPlayers`.
    3. **Reduced strength** — `minPlayers <= availability < maxPlayers`.
    4. **Not playable** — everything remaining, **plus every non-votable date**, which never competes for the first three groups regardless of its tally.
- **Ordering.** Descending by the group's ranking count, then ascending by start time:
    - Full strength: `yes` desc, then `ifNecessary` desc, then start asc.
    - The other three: `availability` desc, then start asc.
      A stable id tie-break keeps equal starts deterministic, matching the existing sorted-dates convention.
- **Group headers.** Fixed translated labels with the group's date count: "Full strength (n)" / "Volle Stärke (n)", "With if-necessary (n)" / "Mit Notfall (n)", "Reduced strength (n)" / "Reduzierte Stärke (n)", "Not playable (n)" / "Nicht spielbar (n)". Empty groups are omitted. The old `available_group` ("Available: N") key retires.
- **View layer shrinks.** The count-based availability grouping helper is removed or reduced to a label mapper over the domain's group kinds; weekly grouping and the `Date | Availability` sort control are unchanged, as is the `?sort=` transport (query, then `HX-Current-URL` on mutations).
- **Both captain pages.** The edit page ranks the organizer team's votes and continues to render all proposed dates (closed ones under **Not playable**); the opponent page already sources only votable dates, so it ranks strictly within its own poll.
- **Sort-only, no gating.** `confirmDate`, `addPlayer`, and every other operation ignore the format. No warning, block, or counter is introduced.
- **Docs.** The `Match Format` glossary entry and ADR-0027 (`docs/adr/0027-match-format.md`) are written; the matching arc42 sections are updated with the implementation.

## Testing Decisions

- **Test external behaviour, not implementation.** Assert on the resulting groups and their order (domain) and on what the user or screenreader sees (views) — never on private helpers. A good test fails if a group boundary, a comparator, or a label is wrong and survives a refactor of the internals.
- **The ranking is unit-tested at the `PostponementRules` seam**, the highest seam in the codebase, using the existing `FakePostponementRules` to fix `newId`/`now`. Prior art: the existing `postponement.spec.ts` specs for `tally` and the domain operations. Cover: each cascade boundary exactly (just below, at, and above `minPlayers`/`maxPlayers`); a non-votable date with a full-strength tally landing in **Not playable**; the within-group order for each group including the `Full strength` `yes`-then-`ifNecessary`-then-date rule; empty groups; and that both teams rank on their own votes.
- **The default format is unit-tested at the existing creation seam** (the domain creation spec): `create` stamps the default, and the format does not affect any other output.
- **The legacy upgrade is unit-tested at the `normalize` seam**, which already exists for read-time migration. Cover: a row without `matchFormat` normalizes to the default; a row with one keeps its value; the result is not written back.
- **The fixture builders are tested by their existing drift spec**, which asserts every required field of a built session — this is what forces the new field into `aSession`.
- **Group labels are tested at the existing view seam** in the edit-page/section and opponent-page component specs, and the sort-control spec: the four headers render with their counts and correct translation, empty groups are absent, and non-votable dates render under **Not playable** on the edit page. Prior art: the current assertions on `Available: N` headers.
- **Happy path and a likely error path are covered in e2e** via the existing Page Objects. Prior art: the availability-sort sections of the postponement-editing and opponent-captain e2e tests, which currently assert `Available: N` groups. Cover: switching to the availability sort shows the new headers and ordering on both pages, a mutation preserves the chosen sort, and switching back restores weekly grouping.
- **Accessibility checks** (`checkA11y`) run on the edit and opponent surfaces at the availability sort, matching existing e2e conventions; the ranking must be conveyed by text, not colour or position.
- **Coverage stays at the project gate** (>= 90%) with a full test run, per the repo convention.

## Out of Scope

- Any UI to view, choose, or edit the Match Format; only the hardcoded default exists.
- Named format profiles beyond `default`, and any per-club or per-match format selection.
- Validation or guard rails on the format's values beyond the default (e.g. `minPlayers > 0`, `minPlayers <= maxPlayers`).
- Any gating, warning, or blocking driven by the format — confirming a **Reduced strength** date is allowed, silently.
- Ranking or sorting on the player-facing vote page and the iCal feed; the availability sort remains a captain-view feature.
- Any change to the counting meaning of `IfNecessary` or to the `Yes`/`No`/`IfNecessary` vote model.
- Click-tt scraping, the creation wizard, and the clash/venue snapshots.
- Per-team formats: one format per Postponement applies to both sides.

## Further Notes

- The glossary entry (`CONTEXT.md`) and ADR-0027 are already in place, so this spec aligns code and locale strings to documented vocabulary rather than the other way round. The ADR records why the format is persisted rather than a global constant, why non-votable dates are forced into **Not playable**, and why the feature is sort-only.
- Known knock-ons for the implementer: the `available_group` locale key retires and four group keys appear (English plus German, fr-CH/it-CH reusing English per ADR-0016); the e2e assertions on `Available: N` are rewritten; `aSession` gains the format.
- The `name` field is the deliberate forward-compatibility hook for named profiles (ADR-0027), mirroring how the retained `club_id` column anticipated multi-tenancy before it was withdrawn.
- The two hours mentioned nowhere here are the Clash buffer (ADR-0023): a Clash can close a date that everyone voted `Yes` on, which is exactly why a closed date must never rank as **Full strength**.
