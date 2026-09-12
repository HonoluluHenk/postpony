# 07: Copy and i18n fixes

**What to build:** Button labels say what they do, counts pluralize correctly, and the status chip is fully translated in German.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] Venue occupancy chip reads "1 other game at this venue" for exactly one match and keeps the plural wording for more; German equivalent added. Follow the localization skill's plural convention if one exists
- [x] Refresh button label is Title Case: "Refresh Schedule Check"
- [x] Confirm button label is "Confirm Date" / "Termin bestätigen"; e2e page-object locator updated and no longer ambiguous with the delete dialog's confirm button
- [x] Status chip translates the Postponement status (Draft / Voting / Confirmed) through new keys before interpolating into the status label; German page shows a German status
- [x] English and German locale files contain every new key; TranslationKeys type compiles
- [x] Component specs cover singular occupancy line and translated status; e2e suites asserting "Confirm" or "Refresh schedule check" updated
