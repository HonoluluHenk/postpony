# 06: Localization & documentation cleanup

**What to build:** The removal is documented and localized. Translation keys that existed only for manual creation and for changing match details are removed; the glossary describes a Match as always scraped from click-tt.ch at creation and never editable afterwards; and the two-path creation decision is recorded as superseded.

**Blocked by:** 02 (Remove the manual create path), 03 (Make the scrape wizard mint-only), 04 (Edit page — read-only Match summary, no change action)

**Status:** ready-for-agent

- [ ] Orphaned translation keys (manual-create and change-match-details strings) removed from en and de locale files; fr-CH/it-CH continue to mirror English per ADR-0016
- [ ] Glossary (`CONTEXT.md`): the `Match` entry states the Match is scraped from click-tt.ch at creation and not editable afterwards
- [ ] ADR-0017 (two-path match creation with in-place change) recorded as superseded by the scrape-only decision
- [ ] `verify` gate (lint → test → build → e2e) green with all coverage ≥ 80%
