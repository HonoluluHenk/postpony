# 02: Copy-to-clipboard announces "Copied"

**What to build:** When the organizer presses either invitation-link copy button, assistive technology hears "Copied to clipboard" (localized) in addition to the existing icon swap, so non-sighted users get confirmation that the link is in the clipboard.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] Initial edit-page render includes a visually-hidden `role="status"` element for clipboard feedback (present before any interaction, per the partial-vs-initial rule)
- [x] Copy buttons carry the localized "copied" label as a data attribute; the client clipboard handler writes it into the status element and clears it after ~2 seconds
- [x] New translation key `copied_to_clipboard` exists in both English and German
- [x] Browser-project UI spec asserts the status text appears after click and clears afterwards
- [x] E2E test clicks a copy button and asserts the status element contains the localized text

## Comments

- `b12c83a` — Implemented: visually-hidden `role="status"` element (`#clipboard-status`) always present in the initial edit render; copy buttons carry `data-copied-label` (new `copied_to_clipboard` key, en+de); `initClipboard` writes it into the status element for 2s alongside the icon swap; browser-project spec + component-render spec + e2e (`invitation-link.e2e.ts`) cover the announcement and its 2s clear. Note: the e2e copy flow does not depend on the clipboard write resolving, so it works headless without clipboard permissions.
