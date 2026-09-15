# ADR 0026: Opponent-Triggered, Own-Side-Only Refresh of the Shared Clash Snapshot

## Status

Accepted

## Context

The edit page shows each Proposed Date's schedule Clashes to the organizer, and
the opponent page shows the opponent team's own clash lines to the opponent
captain — but only the organizer could re-run the schedule check. Every refresh
had to go through the organizer, so the opponent captain vetted dates against
potentially stale chips. The clash snapshot is shared: each Proposed Date stores
both teams' lines plus Venue Occupancy in one record, visible from both pages.

## Decision

The opponent page gains its own schedule re-check (`POST /opponent/:id/refresh-clashes`,
opponent-captain gated, run through the opponent command pipeline) that scrapes
**only the opponent side's** click-tt schedule (`computeOwnSideCheck` in the shared
`src/lib/clash-check.ts`) and merges the fresh lines over the stored snapshot with
the pure `mergeOwnSideClashes` rule (`src/lib/clashes.ts`): the opponent side's
lines are replaced, the organizer side's lines are preserved byte-identical, and
the symmetric `votable` switch is never touched. Venue Occupancy is re-fetched
only when the opponent sits on the **home side** — only the home side can compute
hall data — and a failed occupancy fetch preserves the previous occupancy; the
away side leaves occupancy untouched. A failed check saves nothing: the previous
snapshot keeps rendering with the refresh-failed warning, or the plain nothing
state when no snapshot exists. Success surfaces the refreshed announcement.

## Rationale

Own-side-only keeps each side's schedule that side's business (ADR-0025 scoping):
the opponent refresh can never wipe the organizer's chips, and it never invents
hall data it cannot compute. Merging into the shared snapshot — rather than a
per-side store — means the organizer also sees the freshened opponent-side lines
on their next page load, with no schema change. Never touching `votable` keeps
the ADR-0023 guarantee that a refresh cannot pull dates out of anyone's poll.

## Consequences

- The opponent captain refreshes their own chips without asking the organizer;
  the organizer side's lines survive every opponent re-check.
- Home-side opponent re-checks also freshen Venue Occupancy; away-side ones never do.
- A scrape outage never wipes good data: previous snapshot plus warning, or the
  plain nothing state on a first check that fails.
- No re-check button renders when the opponent side has no team identity
  (hand-entered match), since there is nothing to scrape.

## Alternatives considered

- **Reuse the organizer's full both-teams refresh on the opponent page.** Rejected:
  it would scrape (and thereby expose, via freshened lines) the organizer team's
  schedule from the opponent's action, breaking side scoping.
- **Separate per-side snapshot storage.** Rejected: schema change for no gain —
  the merge rule already isolates each side within the shared record.
- **Re-fetch occupancy on both sides.** Rejected: the away side cannot compute
  hall data (it needs the home club's meetings), so it would either fail always
  or invent data.
