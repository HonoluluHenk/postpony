# 05: Venue-aware deduplication

**What to build:** Changes duplicate detection so that the same datetime at the same venue is deduplicated, but the same datetime at different venues is allowed.

**Blocked by:** 04 (needs generator to produce dates with venue numbers to test dedup meaningfully)

**Status:** ready-for-agent

- [ ] Handler builds composite dedup keys from existing dates: `"\${start}|\${venueNumber ?? 1}"`
- [ ] Passes composite keys as `existingStarts` to the generator (no generator signature change — string keys)
- [ ] Same datetime + same venue → new date is skipped (not added)
- [ ] Same datetime + different venue → new date is added
- [ ] Add unit tests to `edit-handlers.spec.ts`:
    - Duplicate datetime + same venue → only one exists
    - Duplicate datetime + different venue → both exist
    - Generator: same venue skipped, different venue accepted
- [ ] Skipped count from generator correctly accounts for venue-aware dedup
- [ ] All existing unit tests pass
