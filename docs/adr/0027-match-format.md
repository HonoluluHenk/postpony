# ADR 0027: Per-Postponement Match Format Drives Availability Ranking

## Status

Accepted

## Context

The availability sort of Proposed Dates ranked each date purely by raw headcount (`Available: N`, i.e. `yes + ifNecessary` for the viewing captain's own team),
with no notion of how many players a match actually needs. A team match has a
full-strength side and a smaller side it can still be played at, so an organizer
had to eyeball each count against an implicit threshold that the app never knew.

## Decision

Introduce **Match Format**, persisted on every Postponement as `matchFormat`, a
`{ name, minPlayers, maxPlayers }` profile. `PostponementRules.create` assigns
the default profile (`{ name: 'STT Mannschaft', minPlayers: 2, maxPlayers: 3 }`)
to each new Postponement; `normalize` at read time defaults rows written before
the field existed. `name` is stored but not yet surfaced in any UI.

It is a per-side requirement — each team fields up to `maxPlayers` — so the
ranking counts only the viewing captain's own team's votes: `definitive = Yes`
and `availability = Yes + IfNecessary`.

Under `?sort=availability`, votable Proposed Dates fall into four cascading
groups, each taking only what the earlier groups left, sorted descending by the
relevant count and then ascending by start time:

| Group             | Rule (on the remainder)                                           |
|-------------------|-------------------------------------------------------------------|
| Full strength     | `yes >= maxPlayers` (yes desc, then ifNecessary desc, then start) |
| With if-necessary | `availability >= maxPlayers`                                      |
| Reduced strength  | `minPlayers <= availability < maxPlayers`                         |
| Not playable      | everything left, **plus every non-votable date**                  |

Group headers are a fixed translated label plus the date count; empty groups are
omitted. The grouping replaces the old count-based `groupByAvailability` on both
the edit page and the opponent page; `?sort=date` keeps weekly grouping. The
Match Format gates nothing: confirming a date, or adding players, is unaffected.

## Rationale

Persisting the format on the Postponement — rather than reading a global
constant at sort time — is the same forward-compatible move as `club_id`: the
column exists before the feature that needs it, so per-match or per-club formats
can arrive without a migration and legacy rows already have a valid value.
Modelling `minPlayers`/`maxPlayers` as two explicit numbers keeps the two facts
the ranking needs (full strength, still-playable) separate instead of a single
misleading "required players" figure.

The cascade makes the groups a partition, so every date has exactly one home and
the boundaries cannot drift apart. Forcing non-votable dates into *Not playable*
regardless of their counts is deliberate: a closed date cannot be confirmed or
played as-is, whatever its tally says (a clash auto-deselect can close a
date that everyone voted yes on), so ranking it under *Full strength* would
mislead. Counting `IfNecessary` as available follows the existing glossary
definition ("I'll make it work if needed"), while reserving the top group for
firm Yes votes keeps genuine certainty ahead of contingent willingness.

Keeping the format sort-only is the smallest useful slice: the grouping needs the
numbers, but warning or blocking on "reduced strength" would impose a rule the
organizer may deliberately override, and nothing in the request asked for it.

## Consequences

- `Postponement` gains a required `matchFormat`; `normalize` and the test
  fixture builders default it so pre-existing rows and sessions stay valid.
- `groupByAvailability` needs the format and each date's `votable` flag, so its
  signature changes; the `available_group` locale key retires in favour of four
  fixed group labels.
- The availability sort is now threshold-aware on both captain pages; the
  opponent page's already votable-only source needs no extra filtering, the edit
  page keeps rendering closed dates (in *Not playable*).
- No behaviour outside sorting changes; confirming, voting, and roster editing
  ignore the format entirely.

## Alternatives considered

- **Name the concept `MatchConfig` / `MatchSize` / `Lineup`.** `MatchConfig` is
  generic, `MatchSize` collides with the roster and `Lineup` names the fielded
  team rather than the requirement; *Match Format* reads as the format a match is
  played in and matches the `matchFormat` field.
- **A global constant, not persisted.** Rejected: it would have to be redeclared (and migrated) the moment a match needs a different format, and it cannot vary
  per Postponement or club.
- **One `requiredPlayers` number instead of min/max.** Rejected: the ranking
  needs both the full-strength target and the reduced-strength floor; collapsing
  them loses the "could still play, but short-handed" group.
- **Key "reduced strength" on firm Yes only.** Rejected: it would contradict the
  established meaning of `IfNecessary` as available-if-needed, and would push
  dates that can genuinely field a side into *Not playable*.
- **Rank closed dates by count and only exclude them from the polls.** Rejected:
  a date nobody can confirm must not sit in the "full strength" group where the
  organizer reads it as a safe pick.
- **Rename the `name` field away / drop it.** Kept because named profiles (e.g.
  a 3-player vs 2-player format) are the stated direction, even though only the
  default exists today.
