# Remove dead `AvailabilityRecord` type

Status: ready-for-agent

## Summary

`AvailabilityRecord` is declared but has zero references. Player availability entry was never built (see arc42 §1.1.1).

## Evidence

- `src/lib/models.ts:37-40` declares the interface.
- `rg "AvailabilityRecord" src/ e2e-tests/` → only the declaration itself.

## Acceptance criteria

- Delete `AvailabilityRecord` and its now-unused import of `DateTimeRange` if that becomes unused.
- `npm run lint` passes (unused-import and no-unused rules will catch any straggler).
