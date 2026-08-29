# ADR 0022: Persist click-tt Team Identities for Schedule Clash Checks

## Status

Accepted

## Context

The schedule clash check (see `.scratch/clash-checks/spec.md`) needs to scrape both teams' click-tt schedules to see whether a proposed date collides with a scheduled game. The scraper addresses a team by its `(championship, group, teamtable)` triple, but the Postponement model stores only the display names `homeTeam` / `guestTeam` — the wizard discards the teamtable ids after creation, and the untyped `metadata` bag carries league/group/championship only.

## Decision

When a match is created via the scrape wizard, both teams' `(championship, group, teamtable)` are persisted in **typed fields** on the Postponement. The wizard already holds both triples in hand — it scrapes the opponent roster before creating the session — so this is a capture-at-source change, not a new scrape. Hand-entered matches (ADR-0017) get no identity and are shown as "not checked".

## Rationale

At check time the triples are needed for both teams; re-resolving them by display name via `fetchTeams` would reintroduce fragile string matching against a third-party site, and skipping the check entirely would leave the feature blind for the common scrape-created case. Persisting at creation costs one line at the scrape boundary and keeps the check deterministic.

## Consequences

- The Postponement model gains typed team-identity fields, serialized into the session store; old sessions without them keep the "not checked" behavior.
- Hand-entered matches permanently lack clash checks (out of scope to add a manual identity entry).
- The identity fields are click-tt-specific; if the data source ever changes, the fields would be replaced with the new source's identifiers.

## Alternatives considered

- **Re-resolve teamtables by display name at check time** (`fetchTeams` + name match). Rejected: fragile against click-tt name variations and an extra scrape per check.
- **Skip the check unless an id happens to be present.** Rejected: the id would only be present if persisted, which is the decision above.