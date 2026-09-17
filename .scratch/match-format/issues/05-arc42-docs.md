# 05: arc42 documentation update

**What to build:** The arc42 architecture documentation reflects Match Format and the availability ranking, and the docs index records what commit the sections were last verified against.

**Blocked by:** 04

**Status:** ready-for-agent

- [x] The arc42 sections touched by the new domain concept and the ranking are updated (per the change-to-section mapping the docs skill defines).
- [x] The "last verified against commit" line in the arc42 README is bumped to the implementation commit.
- [x] No code or tests change.

## Comments

arc42 updated per the change-to-section mapping: §5 (models/postponement rows + the shared band flow), §8.5 (sort control now describes the four Match-Format bands), §1 (new availability-ranking capability), §12 (Match Format added to the CONTEXT pointer); nothing duplicated from ADR-0027. README "last verified" bumped to `402a177` (the last implementation commit). Docs-only: no code or tests touched. No review fixes needed.
