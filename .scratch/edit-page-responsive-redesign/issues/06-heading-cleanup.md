# 06: Heading cleanup: unbox, rename, drop Match summary

**What to build:** Section headings read as plain headings (no boxed background) so the Proposed Date cards are the only card level; "Scheduling Engine Info" becomes "Schedule" / "Spielplan"; the Match summary paragraph that repeats the page heading is removed while the status chip stays.

**Blocked by:** 04 (Compact heading and invitation row on phone)

**Status:** ready-for-agent

- [ ] Heading pill/box background removed for h2/h3 on the edit page
- [ ] Locale key for the section heading renamed with values "Schedule" (en) and "Spielplan" (de); both locale files in sync
- [ ] Match summary paragraph and its translation key removed if unused elsewhere
- [ ] Unit render spec: no match summary text; new heading text present
- [ ] e2e and page object updated for the new heading text; baselines regenerated
- [ ] `npm run verify` passes
