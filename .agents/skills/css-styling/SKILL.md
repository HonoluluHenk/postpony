---
name: css-styling
description: How CSS and the design system work in this project (PostPony). Use when adding or changing styles, creating new CSS, extracting design tokens, or debugging layout/theme issues. Covers BeerCSS usage, the custom design token catalog, the @layer cascade, and conventions for writing new CSS.
---

# PostPony CSS & Design System

This project uses a layered CSS architecture: **Beer.css** (Material Design 3) for layout, components, and color system, plus application-level **design tokens** for values Beer.css doesn't cover.

## Architecture Overview

```
beer.min.css  —  vendor: MD3 components, theme, grid, reset
design-tokens.css  —  design: custom properties (brand, layout, typography, spacing, borders, spinner)
style.css  —  design: app-specific selectors using design tokens + BeerCSS vars
```

### Cascade order (`@layer`)

Declared in `src/routes/layouts/main.eta`:

```css
@import url('/assets/vendor/css/beer.min.css') layer(vendor);
@layer design;
```

`vendor` < `design` < unlayered (none currently). The `design` layer overrides `vendor` defaults — this is why `--primary: #1a237e` beats beer.css's default `#6750a4`.

### File structure

```
src/public/assets/css/
  design-tokens.css   — all :root custom properties, wrapped in @layer design
  style.css           — app selectors, wrapped in @layer design
src/public/assets/vendor/css/
  beer.min.css        — BeerCSS framework, loaded into @layer vendor
```

## Design Token Catalog

All tokens live in `design-tokens.css` under `@layer design { :root { ... } }`.

### Brand

| Token       | Value     | Purpose                                   |
|-------------|-----------|-------------------------------------------|
| `--primary` | `#1a237e` | Brand primary (overrides BeerCSS default) |

### Layout

| Token                   | Value   | Purpose                |
|-------------------------|---------|------------------------|
| `--container-max-width` | `800px` | Max page content width |

### Typography

| Token                       | Value / Derivation                              |
|-----------------------------|-------------------------------------------------|
| `--heading-scale`           | `0.875` (modular scale factor)                  |
| `--h1-size`                 | `2rem` (base)                                   |
| `--h2-size` ... `--h6-size` | `calc(var(--hN-1-size) * var(--heading-scale))` |
| `--monospace-font`          | `ui-monospace, SFMono-Regular, …`               |

BeerCSS defaults (`h1: 3.5625rem`) are oversized for this app, so the heading scale is pinned explicitly.

### Spacing

| Token       | rem  | px (approx) |
|-------------|------|-------------|
| `--space-1` | 0.25 | 4           |
| `--space-2` | 0.5  | 8           |
| `--space-3` | 0.75 | 12          |
| `--space-4` | 1    | 16          |
| `--space-5` | 1.5  | 24          |
| `--space-6` | 3    | 48          |

### Borders

| Token             | Value |
|-------------------|-------|
| `--border-radius` | `4px` |

### Spinner

| Token                    | Value                 |
|--------------------------|-----------------------|
| `--spinner-size`         | `3rem`                |
| `--spinner-border-width` | `4px`                 |
| `--spinner-speed`        | `0.8s`                |
| `--spinner-overlay`      | `rgba(0, 0, 0, 0.25)` |
| `--spinner-label-bg`     | `rgba(0, 0, 0, 0.65)` |

## BeerCSS Conventions

BeerCSS provides MD3-themed classes for nearly everything. Use them first; reach for design tokens only for values BeerCSS doesn't expose.

### Layout & containers

- `.padding` — 1rem padding
- `.container` — centered content wrapper (from style.css, uses `--container-max-width`)
- `.responsive` — main content area
- `.max` — `flex: 1`
- `.shrink` — `flex-shrink: 1`

### Grid

- `.s1`–`.s12`, `.m1`–`.m12`, `.l1`–`.l12` — responsive column sizes at breakpoints 600px / 992px

### Components

- `.button`, `.field`, `.label`, `.radio`, `.checkbox`, `.chip`, `.list`, `.table`, `.toast`, `.badge`, `.tabs`, `.tooltip`, `.slider`
- Variants: `.fill`, `.border`, `.outline`, `.circle`, `.transparent`, `.error`, `.success`, `.primary`, `.surface-variant`

### Utilities

- `.row`, `.grid`, `.no-wrap`, `.wrap`, `.center-align`, `.right-align`, `.white-text`, `.visually-hidden`, `.small-round`

### Color surface classes

- `.surface-variant`, `.primary`, `.error`, `.success`, `.transparent`, `.light`, `.dark`

## Conventions for Adding Styles

1. **BeerCSS first.** If BeerCSS has a class for it, use it. Don't write custom CSS for what the framework provides.
2. **Token, not literal.** If you need a value BeerCSS doesn't expose (e.g., a custom spacing, monospace font, border-radius), define a token in `design-tokens.css` and reference it. Hardcode nothing.
3. **One repetition → token.** If the same value appears twice, extract a token.
4. **New selectors go in `style.css`** inside the existing `@layer design { ... }` block. Only create a new CSS file if the concern is genuinely separate (e.g., a print stylesheet).
5. **Use BeerCSS theme variables** instead of hardcoded colors: `var(--primary)`, `var(--on-primary)`, `var(--surface-variant)`, `var(--on-surface-variant)`, `var(--error)`, `var(--overlay)`, etc.
6. **Spacing** — prefer `var(--space-N)` over ad-hoc values. If the exact gap you need isn't in the scale, consider whether it should be added to the scale.
7. **No inline `style=""` attributes in templates.** All styling goes through class names (BeerCSS or app-defined).

## Accessibility (WCAG 2.2 AA)

All styles must meet **WCAG 2.2 AA** standards. BeerCSS (Material Design 3) provides contrast-optimized theme colors out of the box — use `var(--on-*)` paired with each background token:

- **Text on surface**: `var(--on-surface)` on `var(--surface)` / `var(--surface-variant)` on `var(--on-surface-variant)`
- **Text on primary**: `var(--on-primary)` on `var(--primary)` — the `.skip-link` pattern in `style.css`
- **Error states**: `var(--error)` background with `var(--on-error)` text

### Focus indicators

BeerCSS provides visible focus rings on interactive elements by default. The `.skip-link` in `style.css` uses an additional off-screen → on-screen pattern for keyboard-first navigation.

### Reduced motion

The spinner respects `prefers-reduced-motion: reduce` by disabling its rotation animation (`style.css`). Apply the same pattern to any new animation:

```css
@media (prefers-reduced-motion: reduce) {
    .my-animated-element {
        animation: none;
    }
}
```

### Color contrast

- Never hardcode foreground colors — always pair a beer.css surface/theme variable with its corresponding `var(--on-*)` contrast token.
- If you add a custom color (new token in `design-tokens.css`), verify its contrast ratios against WCAG 2.2 AA (4.5:1 for normal text, 3:1 for large text).
- The MD3 theme generated by `material-dynamic-colors.min.js` from the `#1a237e` seed handles full-palette contrast automatically.

### Screen reader utilities

The `.visually-hidden` class in `style.css` provides the standard screen-reader-only pattern. Use it for content that should be accessible but visually hidden (e.g., icon-only labels, skip-link text).

### Spinner accessibility

The global spinner (`#global-spinner`) uses `role="status"` and `aria-live="polite"` for screen reader announcements, plus `aria-hidden="true"` on the decorative circle element.

## When to Add a New Token

Add to `design-tokens.css` when:

- A BeerCSS variable doesn't exist for the value (`--border-radius`, `--monospace-font`)
- The value is specific to this app's brand (`--primary: #1a237e`)
- The value repeats across selectors and is not covered by BeerCSS
- You need a named constant for a component configuration (spinner dimensions, animation speed)

## Design Token Gotchas

- BeerCSS declares `--primary` with `#6750a4` (its default). Our `design-tokens.css` overrides it via the `@layer` cascade (`design` > `vendor`), so `var(--primary)` resolves to `#1a237e` everywhere.
- The heading size chain uses `calc()` — `--h6-size` expands to a nested `calc()` string in DevTools but resolves to `~1.0258rem` at runtime.
- `--space-5` (`1.5rem`) is aliased as `.mt-4` margin-top utility for backward compatibility with templates.
- `--overlay` from BeerCSS is `rgb(0 0 0 / .5)`; the spinner uses custom `--spinner-overlay` at `0.25` opacity because the default is too heavy for a loading overlay.

## Relative paths

Paths in this skill (e.g., `src/public/assets/css/`) are relative to the project root.
