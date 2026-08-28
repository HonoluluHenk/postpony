# 01: Pure generator — windowed datetime walker

**What to build:** A pure module walks the planning window for each `(weekday, hh, mm)` tuple and returns the list of ISO datetimes that should be added plus the count that were silently skipped due to dedupe.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Module exposes a single function returning `{ added: string[], skipped: number }`, inputs and outputs as ISO strings.
- [ ] For each tuple, walks from `max(today, anchor − 8 weeks)` in 7-day strides up to and including `anchor + 4 weeks`.
- [ ] Past datetimes (those already elapsed at the caller's `today`) are excluded from `added`.
- [ ] Datetimes already present in `existingStarts` are filtered into `skipped`, not `added`.
- [ ] Equal weekday tuples at **different times** both produce independent rows.
- [ ] Anchor fallback: when no anchor is given, window collapses to `[today, today + 4 weeks]`; module reports this via an out-of-band field so the caller can warn the user.
- [ ] Impossible wall-times (DST-impossible Sundays, out-of-range day/month, out-of-range hour/minute) are filtered by strict-ISO round-trip without crashing the loop.
- [ ] Cap 14 enforced across submitted tuples; inputs above 14 yield the first 14 — server enforces the canonical security-relevant cap, this is the spec-aligned contract.
- [ ] Non-determinism is funneled through caller-supplied `today`, not a hidden clock.
- [ ] Unit spec covers every branch above at minute precision; runs in milliseconds; no Hono context required.

## Comments
