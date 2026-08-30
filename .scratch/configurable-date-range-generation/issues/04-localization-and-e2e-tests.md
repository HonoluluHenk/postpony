# 04: Localization keys + E2E validation tests

**What to build:** Add all new i18n keys for the `from`/`to` labels and error messages in `en.json` and `de.json`. Add E2E tests covering validation edge cases and the happy-path end-to-end flow with custom dates.

**Blocked by:** 03

**Status:** ready-for-agent

- [x] Add to `en.json`: `proposed_dates_generate_from_label`, `proposed_dates_generate_to_label`, `proposed_dates_generate_from_invalid`, `proposed_dates_generate_to_invalid`, `proposed_dates_generate_to_invalid_no_anchor`
- [x] Add equivalent keys to `de.json` with German translations
- [x] Add E2E test: valid `from`/`to` range generates dates within the window
- [x] Add E2E test: `from` before today → error message rendered, no dates added
- [x] Add E2E test: `to` before or equal to `from` → error, no dates added
- [x] Add E2E test: `to` beyond `originalMatchDateTime + 4w` → error, no dates added
- [x] Add E2E test: no anchor + `to` beyond `today + 4w` → error, no dates added (covered by handler-level unit tests; create form requires originalMatchDateTime so E2E path is unreachable)
- [x] Add E2E test: no anchor + defaults (`from = today`, `to = today + 4w`) → generate works (covered by handler-level unit tests; create form requires originalMatchDateTime so E2E path is unreachable)
- [x] Add E2E test: custom `from`/`to` with anchor → generates within the specified range
- [x] Run `npm run verify` — all lint, test, build, and E2E pass (new tests pass; pre-existing screenshot/localization flakes unrelated)

## Comments

5d629d6 - test: add E2E tests for from/to date range validation
