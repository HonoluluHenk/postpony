# 06: Heading cleanup: unbox, rename, drop Match summary

**What to build:** Section headings read as plain headings (no boxed background) so the Proposed Date cards are the only card level; "Scheduling Engine Info" becomes "Schedule" / "Spielplan"; the Match summary paragraph that repeats the page heading is removed while the status chip stays.

**Blocked by:** 04 (Compact heading and invitation row on phone)

**Status:** ready-for-agent

- [x] Heading pill/box background removed for h2/h3 on the edit page
- [x] Locale key for the section heading renamed with values "Schedule" (en) and "Spielplan" (de); both locale files in sync
- [x] Match summary paragraph and its translation key removed if unused elsewhere
- [x] Unit render spec: no match summary text; new heading text present
- [x] e2e and page object updated for the new heading text; baselines regenerated
- [x] `npm run verify` passes

## Comments

- `0353484` ticket done — unboxed the edit-page section headings (dropped `surface-variant` on the four section components and the BeerCSS `header` bands around the h2/h3), renamed `scheduling_engine_info` → `schedule_heading` ("Schedule"/"Spielplan") in both locales, removed the match-summary paragraph + its key and CSS, and updated the unit/e2e specs, page object, and the four edit-page screenshot baselines.
- `a258dcf` review — clean two-axis pass; one judgement call (the `<header>` wrapper deletion is the unbox mechanism, not scope creep), no blocking findings.

