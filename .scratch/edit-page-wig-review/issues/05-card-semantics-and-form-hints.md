# 05: Proposed Date card semantics, form input hints, team-section fields

**What to build:** Each Proposed Date card is exposed to assistive tech as a named group so its clash label is actually announced. Date and time text inputs give phones the right keyboard. Delete dialogs contain their own scrolling. Player-name fields do not trigger password managers, and very long player names wrap inside their row instead of overflowing.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] Proposed Date card wrapper has `role="group"` alongside its existing `aria-label`
- [x] Generator time inputs have `inputmode="numeric"` in 24-hour locales and no `inputmode` in en-US, decided by a typed property on the locale config (no inline locale comparison in the view)
- [x] Generator From/To date inputs have `inputmode="numeric"` in all locales
- [x] Delete-confirmation dialogs have `overscroll-behavior: contain`
- [x] All player-name input variants (valid and invalid, home and away) have `autocomplete="off"`
- [x] Player-name list cells allow wrapping (`min-width: 0`, `overflow-wrap: anywhere`); a 60-character name stays inside the card
- [x] Component specs assert `role`, `inputmode` per locale, and `autocomplete`; existing e2e locators on cards still resolve
