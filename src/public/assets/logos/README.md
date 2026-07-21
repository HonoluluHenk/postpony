# PostPony logo variants

The PostPony brand mark is a **laughing pony peeking over a calendar** whose date arrow moves forward — a friendly visual pun for *postponing* a match.

All variants share one artwork and one palette, so the brand stays consistent.

## Files

| File           | viewBox      | Used for                                                    |
|----------------|--------------|-------------------------------------------------------------|
| `icon.svg`     | `0 0 64 64`  | Source of truth (square mark). Derive everything from this. |
| `wordmark.svg` | `0 0 248 64` | Header logo (icon + "PostPony" text), rendered at 40px.     |
| `favicon.svg`  | `0 0 32 32`  | Browser-tab icon, simplified for 16–32px.                   |

`wordmark.svg` and `favicon.svg` are wired into `src/routes/layouts/main.eta`
(the header `<img>` and the `<link rel="icon">`) and served statically from `/assets/logos/`.

## Color tokens

Reuse exactly these — do not introduce new colors:

- Background indigo: `#1a237e` (matches the app `--primary`)
- Secondary indigo: `#3949ab` (calendar header band, "Pony" text)
- White: `#ffffff` (pony, calendar page, teeth)
- Accent amber: `#ffb300` (forward date arrow only — the "pop" of the joke)

Amber-on-indigo and amber-on-white both clear the WCAG 2.2 AA graphical-contrast bar.

## How the mark is built (step by step)

Author `icon.svg` first, then derive the other two from its paths.

1. **Canvas.** Use a square `viewBox="0 0 64 64"`. Never set a fixed `width`/`height` on the root `<svg>` so it scales freely.
2. **Accessibility skeleton.** On the root `<svg>` set `role="img"` and
   `aria-label="PostPony logo"`, then add `<title>PostPony</title>` and a descriptive `<desc>`
   as the first children.
3. **Background.** A rounded square: `<rect width="64" height="64" rx="14" fill="#1a237e"/>`.
4. **Layer order matters** — draw back to front so the calendar overlaps the pony's chin (the "peeking" effect):
    1. pony (white): ears, forelock tuft, then the head + long muzzle;
    2. facial features (indigo): eyes, nostrils, and the open laughing mouth with a white teeth bar;
    3. calendar (white page + secondary-indigo header band) drawn on top of the chin;
    4. the amber forward arrow (a curved stroke + a filled triangle arrowhead) across the calendar face.
5. **Optimize by hand** (dependency-free): integer coordinates where possible, no unused groups/transforms, no embedded rasters, minimal path points, 2-space indentation.

## Deriving the variants

- **Wordmark** — wrap the whole `icon.svg` body (everything after the root `<svg>`) in
  `<g transform="translate(4 4) scale(0.875)">` so the 64-unit mark fits the 56px icon slot, then place the text at `x="76"`: `Post` in `#1a237e`, `Pony` in `#3949ab`. Keep the
  `viewBox="0 0 248 64"` so the 40px header slot is unaffected.
- **Favicon** — redraw the mark simplified for tiny sizes: drop the forelock and nostrils, keep bold ears/eyes/grin, a thicker arrow, and a compact calendar. Target legibility at 16px, not detail.

## Validation checklist

Before committing a new or changed variant:

1. **Well-formed + accessible:** `npm test` runs `logos.spec.ts`, which parses each SVG and asserts it has `role="img"` and `<title>PostPony</title>`.
2. **Served correctly:** the E2E test `e2e-tests/start-page.e2e.ts` checks the header logo and favicon load with `content-type: image/svg+xml` and that the start page has no Axe violations (`npm run e2e`).
3. **Lint/types:** `npm run lint`.
4. **Small-size legibility:** eyeball `favicon.svg` at 16/24/32px (e.g. drop it into an
   `<img width="16">` or check the browser tab at `https://game-scheduler.localhost:3000`).
