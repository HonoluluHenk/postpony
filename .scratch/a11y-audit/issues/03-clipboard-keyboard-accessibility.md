# 03 — Clipboard button keyboard accessibility

**What to build:** The two clipboard copy buttons on the edit page use `<i role="button" tabindex="0">` with only a `click` listener, so they cannot be activated via keyboard (Enter/Space), violating WCAG 2.1.1.

**Status:** ready-for-agent

**Blocked by:** None — can start immediately.

## Current code

`src/routes/edit/id/edit.eta` lines 23 and 27:

```eta
<i class="clipboard-btn" data-copy="..." aria-label="copy_to_clipboard" role="button" tabindex="0">content_copy</i>
```

`src/public/assets/js/main.js` lines ~83-97: `initClipboard()` only listens for `click` events.

## Fix options

1. Replace `<i>` with a native `<button>` — gets keyboard handling for free, no ARIA needed. Style as needed.
2. Keep `<i role="button">` but add a `keydown` listener in `initClipboard()` that fires on Enter and Space.

Option 1 is preferred (native semantics, fewer moving parts).

## Acceptance criteria

- [ ] Clipboard copy can be activated by keyboard (Enter and Space)
- [ ] `checkA11y()` passes on the edit page
- [ ] Copy-to-clipboard still works via click
