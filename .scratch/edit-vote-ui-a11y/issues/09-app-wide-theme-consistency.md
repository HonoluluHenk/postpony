# 09: App-wide: one type family and a declared color-scheme

**What to build:** the type-face split between the edit redesign and the rest of the app disappears: every page (start, create, vote, join, edit) renders body text in the single self-hosted type family already defined by the tokens, with the condensed face staying scoped to the edit date cells. The document also declares its `color-scheme` so native scrollbars, selects, and the date-picker dialogs render correctly on dark-mode operating systems without inventing a dark palette, and the theme-color meta comes from the single surface token instead of a hardcoded value.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] All page types render body text in the single self-hosted family; the condensed face appears only where the edit rail's date cells use it.
- [ ] The document declares `color-scheme` such that native controls render against the light theme on dark-mode OSes; no dark palette is introduced.
- [ ] The theme-color meta equals the surface token and is sourced from it, not a duplicate literal.
- [ ] A spot accessibility pass across start, vote, join, and edit finds no regressions from the shared family swap.