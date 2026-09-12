# 01: Page shell polish and organizer-password notice

**What to build:** The shared page shell meets the Web Interface Guidelines for theming, layout stability, and touch: the browser chrome color matches the page background, the logo reserves its space before loading, the language selector is a comfortable tap target with explicit colors, taps respond without double-tap delay, multi-line headings are balanced, and the footer shows the current year. On the edit page, the organizer-password success notice is announced as a polite status rather than an alert, and the password value is protected from machine translation.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] `<head>` contains a `theme-color` meta whose value equals the light-surface design token used for the body background
- [x] Header logo `<img>` declares both `width` and `height` matching the SVG aspect ratio at height 40
- [x] Language selector renders at least 24px tall and declares explicit `background-color` and `color` from design tokens
- [x] `body` has `touch-action: manipulation`
- [x] Headings (h1–h4) use `text-wrap: balance`
- [x] Footer year is computed at render time; no hard-coded year remains in templates or tests
- [x] Organizer-password toast has `role="status"` (not `role="alert"`); e2e page-object locators updated accordingly
- [x] Organizer password value carries `translate="no"`
- [x] Component spec asserts the toast role and `translate` attribute; e2e a11y check (`checkA11y`) passes on the edit page
- [x] Screenshot baselines updated if the shell changes shift pixels

## Comments

- `08131eb` — ticket done: 01-page-shell-polish. Shell polish (theme-color, logo dims, language select ≥24px + explicit colors, touch-action, balanced headings, computed footer year) plus organizer-password toast role=status / translate=no, component specs, page-object locator rename, and regenerated screenshot baselines.
