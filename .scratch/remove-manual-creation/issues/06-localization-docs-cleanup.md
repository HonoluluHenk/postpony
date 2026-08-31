# 06: Localization & documentation cleanup

**What to build:** The removal is documented and localized. Translation keys that existed only for manual creation and for changing match details are removed; the glossary describes a Match as always scraped from click-tt.ch at creation and never editable afterwards; and the two-path creation decision is recorded as superseded.

**Blocked by:** 02 (Remove the manual create path), 03 (Make the scrape wizard mint-only), 04 (Edit page — read-only Match summary, no change action)

**Status:** ready-for-agent

- [x] Orphaned translation keys (manual-create and change-match-details strings) removed from en and de locale files; fr-CH/it-CH continue to mirror English per ADR-0016
- [x] Glossary (`CONTEXT.md`): the `Match` entry states the Match is scraped from click-tt.ch at creation and not editable afterwards
- [x] ADR-0017 (two-path match creation with in-place change) recorded as superseded by the scrape-only decision
- [x] `verify` gate (lint → test → build → e2e) green with all coverage ≥ 80%

## Comments

- `95d2721` — step 1: removed the six spec-enumerated orphaned translation keys (`create_new`, `create_postponement_title`, `change_match_details`, `change_match_details_title`, `change_via_scrape`, `save_changes`) from en/de; fr/it mirror English per ADR-0016; key parity verified
- `4010f73` — step 2: CONTEXT.md Match glossary entry reworded to scrape-only creation, not editable afterwards
- `b245729` — step 3: ADR-0017 status → "Superseded by ADR-0024"; new ADR-0024 (scrape-only match creation) recorded
- `726d9c1` — `ticket done: 06-localization-docs-cleanup`: all four criteria ticked; lint/test/build green (579 tests, coverage ≥80%); e2e left to ticket 05 (parallel)
- `5630af2` — review: 0 standards findings, 0 spec findings; noted four additional manual-form keys (`create_button`, `guest_team_required`, `home_team_required`, `original_match_date_time_invalid`) equally orphaned but outside the spec's six-key enumeration — follow-up only, no fixes needed
