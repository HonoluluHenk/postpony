# 06 — Locale-aware prefill and date display

**What to build:** Dates already in the system render and prefill in the resolved locale: a scraped match's original date prefills the proposed-date field in locale tokens, and proposed-date lists plus the vote tallies on the edit, join, and vote views display in the locale's Intl format.

**Blocked by:** 02, 03

**Status:** ready-for-agent

- [ ] The scraped original match date prefills the field in the locale's format.
- [ ] Proposed-date list and vote tallies on the edit, join, and vote views render in the resolved locale.
- [ ] Dates entered before this feature (ISO in storage) round-trip and display correctly.
- [ ] E2E for the editing flow asserts localized rendering.
