# 01: Page shell polish and organizer-password notice

**What to build:** The shared page shell meets the Web Interface Guidelines for theming, layout stability, and touch: the browser chrome color matches the page background, the logo reserves its space before loading, the language selector is a comfortable tap target with explicit colors, taps respond without double-tap delay, multi-line headings are balanced, and the footer shows the current year. On the edit page, the organizer-password success notice is announced as a polite status rather than an alert, and the password value is protected from machine translation.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] `<head>` contains a `theme-color` meta whose value equals the light-surface design token used for the body background
- [ ] Header logo `<img>` declares both `width` and `height` matching the SVG aspect ratio at height 40
- [ ] Language selector renders at least 24px tall and declares explicit `background-color` and `color` from design tokens
- [ ] `body` has `touch-action: manipulation`
- [ ] Headings (h1–h4) use `text-wrap: balance`
- [ ] Footer year is computed at render time; no hard-coded year remains in templates or tests
- [ ] Organizer-password toast has `role="status"` (not `role="alert"`); e2e page-object locators updated accordingly
- [ ] Organizer password value carries `translate="no"`
- [ ] Component spec asserts the toast role and `translate` attribute; e2e a11y check (`checkA11y`) passes on the edit page
- [ ] Screenshot baselines updated if the shell changes shift pixels
