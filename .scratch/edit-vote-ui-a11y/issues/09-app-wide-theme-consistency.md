# 09: App-wide: one type family and a declared color-scheme

**What to build:** the type-face split between the edit redesign and the rest of the app disappears: every page (start, create, vote, join, edit) renders body text in the single self-hosted type family already defined by the tokens, with the condensed face staying scoped to the edit date cells. The document also declares its `color-scheme` so native scrollbars, selects, and the date-picker dialogs render correctly on dark-mode operating systems without inventing a dark palette, and the theme-color meta comes from the single surface token instead of a hardcoded value.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [x] All page types render body text in the single self-hosted family; the condensed face appears only where the edit rail's date cells use it.
- [x] The document declares `color-scheme` such that native controls render against the light theme on dark-mode OSes; no dark palette is introduced.
- [x] The theme-color meta equals the surface token and is sourced from it, not a duplicate literal.
- [x] A spot accessibility pass across start, vote, join, and edit finds no regressions from the shared family swap.

## Comments

- `fdebf01` ticket done: 09-app-wide-theme-consistency — one `--font` (Plex + vendor fallback) app-wide, `color-scheme: light`, theme-color meta sourced from `--theme-color`/`--surface` via `initThemeColor`, guard specs, arc42 8.11.
- `3745023` review: 09-app-wide-theme-consistency
- `7bf0e95` review-fixed: 09-app-wide-theme-consistency — trailing newline in `design-tokens.spec.ts`.

Coordinator: run the e2e + axe spot check across start/vote/join/edit (criterion 4 verification is delegated here — no e2e run in this subtree).