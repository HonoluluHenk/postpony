# 02: Add the design token catalog

**What to build:** Add the tokens the redesigned edit page needs to the design token layer, without changing any selector yet — an expand-only step so the migration that follows has a vocabulary to consume. Add:

- Spacing: `--space-0-5` (0.125rem), `--space-1-5` (0.375rem), `--space-2-5` (0.625rem), `--space-3-5` (0.875rem), `--space-4-5` (1.25rem), `--space-7` (4rem).
- Type: `--font-size-xs` (0.75rem), `--font-size-sm` (0.85rem), `--font-size-md` (0.9rem), `--font-size-base` (1rem), `--font-size-lg` (1.1rem), `--font-size-xl` (1.3rem).
- Radius: `--radius-pill` (999px), `--radius-card` (8px), `--radius-sm` (6px).
- Layout: `--sidebar-width` (300px), `--date-cell-width` (11rem), `--edit-max-width` (72rem).
- Chip colours: `--chip-clean-bg`/`--chip-clean-fg`, `--chip-warn-bg`/`--chip-warn-fg`, `--chip-error-bg`/`--chip-error-fg`, initial values matching what the prototype renders today (the warning foreground keeping its current amber).

Existing tokens (`--space-1..6`, the brand colour, border radius, fonts, palette) are not modified. Nothing consumes the new tokens yet, so the rendered app is byte-identical.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] All tokens above are defined in the design token layer with the stated values.
- [ ] No existing token value changed.
- [ ] No selector references a new token yet.
- [ ] `npm run lint`, `npm run test` and `npm run e2e` pass with no screenshot-baseline changes.
