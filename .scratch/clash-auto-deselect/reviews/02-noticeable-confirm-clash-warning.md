# Review: 02-noticeable-confirm-clash-warning

Reviewed diff: `HEAD~1...HEAD` (commit `341092c` — ticket done: 02-noticeable-confirm-clash-warning)

## Standards

No findings. The change conforms to the repo's documented standards:

- New selector `.confirm-clash-warning` lives inside the existing `@layer design` block in `src/public/assets/css/style.css`, per the css-styling skill ("new selectors go in style.css inside the existing @layer design block").
- Styling uses design tokens only (`var(--error)`, `var(--on-error)`, `var(--space-2/3/4)`, `var(--border-radius)`); no hardcoded literals, no inline `style=""` attributes.
- WCAG error-state guidance followed: `var(--error)` background paired with `var(--on-error)` text (css-styling skill: "Error states: `var(--error)` background with `var(--on-error)` text").
- Decorative warning icon is `aria-hidden="true"`; the text node carries the message. `role="alert"` retained.

## Spec

No findings. Matches ticket `02`:

- `clash_check_confirm_warning` message key and its content unchanged (ticket: "the warning's content ... are UNCHANGED").
- When it appears is unchanged: still gated on `confirmClashWarning`, still set by `confirm-date-post.ts` from `hasClashes` (untouched).
- Accessibility role/announcement unchanged: `role="alert"` kept (ticket + spec: "its role/announcement semantics are unchanged").
- Styled more noticeably: persistent high-visual-weight banner (solid `--error` surface + bold text) replaces the throwaway red `.error` text (ticket: "higher visual weight and persistent rather than a one-shot toast").
- View-level test covers the updated rendering: `proposed-dates-section.spec.tsx` now asserts `class="confirm-clash-warning mt-2"` and `role="alert"` (ticket criterion 4).
- Existing view-level test still asserts a clean confirm renders no warning (criterion 5) and the clash-confirm path still renders the warning (criterion 1, via the unchanged `confirm-date-post.ts` + `proposed-dates-section.tsx`).

## Summary

Standards: 0 findings. Spec: 0 findings. No fixes required.
