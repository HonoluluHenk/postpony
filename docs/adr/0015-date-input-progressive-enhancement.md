# ADR 0015: Proposed-Date Picker — Progressive Enhancement

## Status
Accepted

## Context
The edit page lets the owner add proposed dates via a single `<input type="datetime-local">`. That native control is excellent on mobile/touch (platform keyboard, scroll wheels, locale-aware) but poor on desktop: collapsed into two cramped text fields, no calendar, and inconsistent time entry across browsers.

We wanted one field that is the best picker for the device: keep the native control where it shines (touch), add a calendar + time picker on desktop.

## Decision
Use **progressive enhancement on a single input**:

- **Touch / coarse pointer** (`window.matchMedia('(pointer: coarse)')`): keep the native `<input type="datetime-local">` untouched.
- **Desktop / fine pointer**: the field stays `type="datetime-local"` server-side, but on page load JavaScript flips it to `type="text"` and initializes **air-datepicker v3.6.0**, vendored under `src/public/assets/vendor/` (no new npm dependency, matching the existing vendor pattern).

The picker is configured with `dateFormat: 'yyyy-MM-dd'`, `timeFormat: 'HH:mm'`, `dateTimeSeparator: ' '`, positioned `top center`. It is re-initialized on HTMX partial swaps via a global `htmx:afterSettle` hook that destroys and recreates the `activeDatePicker` singleton.

## Wire format
The server contract is unchanged: `YYYY-MM-DDTHH:mm`. Air-datepicker's format tokenizer treats `T` as a literal token, so the input shows `2026-08-29 16:00` (space separator); the server's `DATETIME_LOCAL_PATTERN` was relaxed to accept `[T ]` and `Temporal.PlainDateTime.from()` normalizes both forms to `T` on save.

## Library choice
air-datepicker over alternatives (e.g. flatpickr): actively maintained, themed entirely via CSS variables (fits the design-token system), supports keyboard navigation and localization without extra dependencies. Reason for vendor-embed: no build step for `public/assets`; version pinned in-repo.

## Accessibility

- Time picker is a pair of native `input[type="range"]` sliders; air-datepicker ships no ARIA labels, so `patchTimeSliderLabels()` adds localized `aria-label`s from vendored locale data (new `hours`/`minutes` keys) in the `onShow` callback (the slider DOM is built lazily on first show).
- CSS enforces WCAG 2.2 target size on slider rows (24px height, 24px bottom margin) and themes the popup with the app's design tokens.
- Removed a hardcoded `lang="de"` on the input so the picker locale follows `document.documentElement.lang`.
- axe checks run against the open picker in e2e.

## Consequences

- Two UI states per input (native vs air-datepicker) — both must stay in sync in initial render and HTMX partial; covered by `e2e-tests/date-picker.e2e.ts` (desktop picker interaction + Pixel 5 touch assertion) and the existing edit-page tests.
- Keyboard-typed input still works on desktop (field remains an editable text input), so e2e `fill()` calls are unaffected.
- The pre-filled value is deterministically reformatted to the space-separated form on desktop; tests assert that form.
- Vendor files (~70 KB) are served statically without bundling.
