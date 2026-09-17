# 03: Edit page availability sort

**What to build:** Choosing *Availability* on the organizer's edit page ranks the proposed dates into the four Match Format groups, each headed by a fixed translated label with its date count. The old raw-count grouping disappears on this page; *Date* keeps its weekly grouping, closed dates stay visible under *Not playable*, and the chosen sort survives mutations.

**Blocked by:** 02

**Status:** ready-for-agent

- [x] The edit page's availability sort renders the four groups from the domain ranking, scoped to the organizer team's votes.
- [x] Headers are fixed labels with the group's date count (zero-count groups omitted): "Full strength (n)" / "Volle Stärke (n)", "With if-necessary (n)" / "Mit Notfall (n)", "Reduced strength (n)" / "Reduzierte Stärke (n)", "Not playable (n)" / "Nicht spielbar (n)".
- [x] English and German locale files stay in sync; the retired count-group key is removed. fr-CH/it-CH keep reusing English.
- [x] Non-votable proposed dates render under *Not playable* and are never dropped from the rail.
- [x] The *Date* sort and the `?sort=` transport (including recovery from `HX-Current-URL` on mutations) are unchanged; switching sorts preserves the selection.
- [x] The shared count-based grouping helper is reduced to mapping a group kind to its label, or removed, so there is one availability sort.
- [x] Component coverage: the four headers render with counts and translations, empty groups are absent, closed dates sit under *Not playable*.
- [x] E2E coverage via the edit Page Object: switch to Availability, assert the new headers and ordering, mutate to confirm the sort sticks, switch back to weekly grouping. `checkA11y()` passes at the availability state.
