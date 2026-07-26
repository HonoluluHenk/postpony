---
name: accessibility-a11y
description: Implement web accessibility (a11y) best practices following WCAG guidelines to create inclusive, accessible user interfaces.
---

# Accessibility (a11y) Best Practices

You are an expert in web accessibility and inclusive design. Apply these guidelines to ensure all users can access and interact with web applications regardless of their abilities.

## Core Accessibility Principles

- Follow WCAG (Web Content Accessibility Guidelines) standards
- Use semantic HTML to improve accessibility and screen reader compatibility
- Ensure high accessibility standards using ARIA roles and native accessibility props
- Design for all users including those with visual, auditory, motor, and cognitive disabilities
- Test with various assistive technologies

## Semantic HTML

### Structural Elements

- Use semantic elements like `<header>`, `<main>`, `<footer>`, `<nav>`, `<article>`, `<section>`, `<aside>`
- Employ `<button>` for interactive elements, not `<div>` or `<span>`
- Use proper heading hierarchy (h1-h6) without skipping levels
- Use landmarks (e.g., `<nav>`, `<main>`, `<aside>`) for screen reader navigation
- Avoid deprecated markup

#### `<section>` requirements (MDN)

- Each `<section>` must have a heading (`<h1>`-`<h6>`) as its first child. If there's no heading, use `<div>` instead — it's a layout wrapper, not a document section.
- Do not nest `<section>` inside `<section>` unless the inner section is a true subsection (e.g., chapters in a book). Grid/card layouts wrapping independent sections should use `<div>`.

### Form Accessibility

- Associate labels with form inputs using `for` and `id` attributes
- Group related form elements with `<fieldset>` and `<legend>`
- Provide clear error messages and validation feedback
- Use appropriate input types (email, tel, number, etc.)
- Include placeholder text as supplementary hints, not replacements for labels

#### PostPony form patterns

The standard form field pattern across PostPony (see `src/routes/create/create.eta`):

```eta
<div class="field label border fill <%= it.errors?.fields?.name ? 'invalid' : '' %>">
  <input type="text" id="reschedule-name" name="name" required aria-required="true"
         value="<%= it.values?.name || '' %>"
         <% if (it.errors?.fields?.name) { %> aria-invalid="true" aria-describedby="name-error" <% } %>>
  <label for="reschedule-name"><%= it.t('reschedule_name') %></label>
  <span id="name-error" class="error" role="alert"><%= it.errors?.fields?.name || '' %></span>
</div>
```

Key points:

- BeerCSS wrapper: `<div class="field label border fill">` — the `.invalid` class triggers error styling
- `<label for="id">` pairs with `<input id="id">`
- Error state: `aria-invalid="true"` + `aria-describedby="error-id"` on the input
- Error message `<span>` has `role="alert"` for screen reader announcement
- **Known gap**: several edit-page partials (`team-section.eta`, `venue-section.eta`, `proposed-dates-section.eta`) show errors but omit `aria-invalid` and `aria-describedby` — fix those if you're working in that area.

BeerCSS hides native radio/checkbox inputs visually. In e2e tests, toggle them by clicking the associated `<label>` text, not `.check()` on the input. See `e2e-tests/pages/` for examples.

## HTMX + a11y

These patterns are specific to PostPony's use of HTMX for partial page updates.

### aria-busy and loading states

- The global spinner (`#global-spinner` in `src/routes/layouts/main.eta`) uses `role="status" aria-live="polite"` and is shown/hidden via JS. It is `aria-hidden="true"` by default.
- When the spinner appears, `spinner.js` sets `aria-busy="true"` on it — but `aria-busy` should ideally be set on the **region being updated** (the `hx-target`), not the spinner itself.
- There is no per-target loading indicator via `hx-indicator`. The global spinner is the only loading feedback.
- If you add per-target loading states, use `aria-busy="true"` on the swap target during the request and remove it after swap completes.

### Focus management after HTMX swaps

**This is the biggest a11y gap in PostPony.** When HTMX replaces a section after a form submission (add player, add proposed date, change venue), focus is not moved anywhere. If the focused element was inside the replaced content, focus is lost entirely.

Rules for any HTMX partial handler:

- On success: move focus to the `<h2>`–`<h4>` heading of the swapped section. The heading needs `tabindex="-1"` to receive programmatic focus.
- On error (validation failure): move focus to the `[role="alert"]` error element.
- For `hx-boost` navigation: move focus to the `<h1>` or the first `<h2>` in `#main-content`. Update `document.title` from the response.

Approach (implement in `main.js` or a dedicated helper):

```js
// ponytail: simple focus helper; upgrade to a registration-based system if
// the number of swap targets grows beyond a handful.
function focusAfterSwap(targetId, selector = 'h2, h3, h4, [role="alert"]') {
  const target = document.getElementById(targetId);
  if (!target) return;
  const el = target.querySelector(selector) ?? target;
  el.setAttribute('tabindex', '-1');
  el.focus();
}
```

Wire it via `hx-on="htmx:afterSwap: focusAfterSwap('team-management', 'h4')"` or an event listener on `htmx:afterOnLoad`.

### Error pattern with role="alert"

**File:** `src/routes/partials/error-container.eta`

```eta
<div id="error-container" hx-swap-oob="true">
  <% if (it.globalError) { %>
    <div class="error padding white-text" role="alert">
      <i aria-hidden="true">error</i>
      <div class="max"><p><%= it.globalError %></p></div>
    </div>
  <% } %>
</div>
```

- The outer `<div id="error-container">` is always present in the layout (full render) and replaced OOB in partial renders.
- The inner `<div role="alert">` ensures screen readers announce errors immediately.
- Every error partial is included via `<%~ include('../../partials/error-container.eta', {globalError: it.globalError}) %>` at the top of the partial template.

### Partial template considerations

- Partial templates (rendered for `hx-target` swaps) wrap content in `<section id="...">` with a heading. They include the error-container via OOB swap. See `src/routes/edit/id/team-section.eta`, `venue-section.eta`, `proposed-dates-section.eta`.
- The heading in each partial serves as the focus target after a swap.
- Dynamically swapped sections with no `aria-live` attribute won't announce content changes unprompted. Adding `aria-live="polite"` to swapped sections is recommended.

## ARIA Implementation

### When to Use ARIA

- Use ARIA roles and attributes to enhance accessibility where semantic HTML is insufficient
- Prefer native HTML elements over ARIA when possible
- Use `aria-label` for elements without visible text labels
- Implement `aria-describedby` for additional context
- Use `aria-live` regions for dynamic content updates

### Common ARIA Patterns

- Use `role="button"` only when a non-button element must act as a button
- Implement `aria-expanded` for collapsible content
- Use `aria-hidden="true"` for decorative elements
- Apply `aria-current="page"` for navigation highlighting
- Use `aria-labelledby` to reference visible labels

## Visual Accessibility

### Color and Contrast

- Ensure sufficient color contrast for text (minimum 4.5:1 for normal text, 3:1 for large text)
- Never use color as the only means of conveying information
- Provide alternative indicators (icons, patterns, text) alongside color
- Test designs with color blindness simulators

### Focus Management

- Use focus styles to indicate focus state clearly
- Ensure visible focus indicators on all interactive elements
- Manage focus appropriately when content changes dynamically
- Avoid removing outline styles without providing alternatives
- Implement logical tab order

#### HTMX swap focus management

When a section is replaced by an HTMX partial response, the browser does not automatically move focus. This is a known gap in PostPony (see `.scratch/a11y-audit/issues/01-htmx-focus-management.md`). The pattern to follow:

1. The swapped section's `<h2>`–`<h4>` should have `tabindex="-1"` so it can receive programmatic focus
2. On success: `document.getElementById('section-id').querySelector('h2, h3, h4').focus()`
3. On validation error: `document.querySelector('[role="alert"]').focus()`
4. For `hx-boost` navigations: move focus to `#main-content` heading after swap

## Keyboard Navigation

### Navigation Requirements

- Provide keyboard navigation for all interactive elements
- Ensure all functionality is accessible via keyboard alone
- Use tabindex appropriately (0 for natural order, -1 for programmatic focus)
- Implement keyboard shortcuts for complex interactions
- Avoid keyboard traps

### Interactive Elements

- Ensure interactive elements are large enough for touch (minimum 44x44 pixels)
- Implement keyboard event handlers alongside click handlers
- Support Enter and Space keys for activating buttons
- Implement arrow key navigation for complex widgets

#### Clipboard buttons

PostPony has two clipboard copy `<i>` elements in `src/routes/edit/id/edit.eta` that use `role="button" tabindex="0"` but only listen for `click` events in `main.js`. They are **missing keyboard handlers** — Enter and Space do nothing. Fix: either replace with `<button>` elements or add keydown handlers.

## Content Accessibility

### Images and Media

- Ensure all images have descriptive alt text
- Use empty alt="" for decorative images
- Provide captions for videos
- Include transcripts for audio content
- Use descriptive link text (avoid "click here")

### Text and Typography

- Use relative units (rem, em) for typography
- Ensure text can be resized up to 200% without loss of functionality
- Maintain adequate line height and letter spacing
- Avoid justified text which can create uneven spacing
- Support user preferences for reduced motion

## Locale and Internationalization

PostPony supports English and German locales.

- The `lang` attribute on `<html>` is set dynamically via `<%= it.locale %>` in `src/routes/layouts/main.eta` line 3. Value comes from the locale middleware (`src/lib/middleware/language.ts`): query param `?lang=` > `lang` cookie > `Accept-Language` header > default (`en`).
- The locale switcher in the header uses visible label text and `aria-label` on flag images. Language links use `hx-boost="false"` to avoid HTMX intercepting the redirect.
- When adding new routes: the `lang` attribute is handled by the layout and locale middleware. No manual wiring needed.
- When adding new locale keys: update both `src/locales/en.json` and `src/locales/de.json`. See the `localization` skill.

## PostPony accessibility checklist

When adding a new route handler + Eta template, verify each item:

- [ ] **Heading**: does the page have an `<h1>` (layout provides it) with child page starting at `<h2>`? No heading level skips (h1→h3 is a violation).
- [ ] **Section**: every `<section>` has a heading (`<h1>`–`<h6>`) as first child. Use `<div>` for layout wrappers without headings.
- [ ] **Error container**: the template includes `error-container` — either inline in the layout or via `<%~ include('../../partials/error-container.eta', ...) %>` in partials.
- [ ] **Focus**: after any HTMX swap, where does focus land? Must move to the section heading or the `[role="alert"]` error.
- [ ] **Lang**: `<html lang="<%= it.locale %>">` is handled by `main.eta`. No action needed.
- [ ] **Skip link**: `<a href="#main-content" class="skip-link">` is handled by `main.eta`. No action needed.
- [ ] **Labels**: every `<input>` has a matching `<label for="id">`.
- [ ] **Error attributes**: form fields with errors use `aria-invalid="true"` + `aria-describedby="error-id"` linking to a `<span role="alert">`.
- [ ] **Images**: all `<img>` tags have descriptive `alt` or `alt=""` for decorative.
- [ ] **e2e**: call `await checkA11y()` after the page/section is stable. See the Testing section below.

## Responsive and Adaptive Design

### Mobile-First Approach

- Design mobile-first, then scale upward
- Implement responsive layouts that work across devices
- Ensure touch targets are appropriately sized
- Support both portrait and landscape orientations

### User Preferences

- Respect `prefers-reduced-motion` for animations
- Support `prefers-color-scheme` for dark/light modes
- Consider `prefers-contrast` for high contrast needs
- Implement `prefers-reduced-transparency` when applicable

#### PostPony motion coverage

Currently `prefers-reduced-motion` only disables the spinner rotation animation (`src/public/assets/css/style.css` lines 148–152). The skip-link transition (`transition: top 0.2s`) and clipboard button transition (`transition: opacity 0.15s`) are not covered. Extend the media query to cover them.

## Testing and Validation

### Automated Testing

- Use tools like Lighthouse for accessibility audits
- Integrate axe-core for automated accessibility testing
- Run accessibility checks in CI/CD pipelines
- Address all critical and serious accessibility issues

### PostPony e2e a11y fixture

- Every e2e test calls `await checkA11y()` at a stable UI state. The `checkA11y` fixture is defined in `e2e-tests/fixtures.ts` and wraps `@axe-core/playwright` with tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22a`, `wcag22aa`.
- Add `{checkA11y}` or `{page, checkA11y}` to the test's destructured parameters.
- Call `checkA11y()` after all assertions have settled and the page is in a stable state (modals closed, HTMX swaps complete, scroll done).
- For custom rule exclusions, use the `makeAxeBuilder` fixture instead: `const results = await makeAxeBuilder().disableRules(['color-contrast']).analyze();`.
- Violations are logged to stderr with full detail before the assertion fires, making CI debugging easier.
- All 8 e2e test files call `checkA11y()` at least once — see coverage matrix in `.scratch/a11y-audit/issues/`.

### Manual Testing

- Test with screen readers (NVDA, JAWS, VoiceOver)
- Navigate entirely by keyboard
- Test with browser zoom at 200%
- Use browser accessibility inspection tools
- Test with actual users who have disabilities when possible

## CSS Best Practices for Accessibility

- Use external stylesheets; avoid inline styles for maintainability
- Leverage Flexbox and Grid for robust layouts
- Use class selectors for styling (BEM naming methodology recommended)
- Implement responsive design with media queries
- Ensure hover states also have focus equivalents
