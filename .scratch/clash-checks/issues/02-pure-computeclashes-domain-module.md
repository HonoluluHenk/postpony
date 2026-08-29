# 02: Pure computeClashes domain module

**What to build:** The single new seam for the Clash feature. A pure domain function takes the proposed dates, both teams' scraped schedules, and the original match, and returns per-Proposed Date Clash results `{home: Clash[], away: Clash[]}`. A Clash is `{opponent, start}` with the start ISO-normalized via the existing click-tt date-time parser — raw click-tt strings never enter the model. A scheduled game clashes when its start falls within the proposed range plus a two-hour buffer on either side (one named constant). The postponed match itself is excluded from both schedules before evaluation. The function performs no I/O.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Given schedules and proposed dates, the clash sets per date are exactly right
- [x] Boundary coverage: game start exactly at the ±2h edge counts as a clash; just outside does not
- [x] Clashes are split per team; a game listed on both team pages appears on both sides
- [x] The postponed match (same date + home/guest names) is excluded
- [x] Multiple clashes on one date all appear; empty schedules yield an empty result