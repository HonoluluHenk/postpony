---
name: semantic-html
description: >-
  Enforces semantic HTML and accessible (a11y/ARIA) markup — element choice,
  nesting rules, heading hierarchy, landmarks, accessible names, ARIA state
  and properties, keyboard interaction, form labeling, table structure, focus
  management, and link semantics.  Use when the user writes, reviews, or
  refactors HTML for accessibility; chooses between `section`, `article`,
  `aside`, `nav`, `div` and other elements; checks heading or landmark
  structure; applies or reviews ARIA roles, states, and properties; audits
  keyboard accessibility or focus management; reviews form labels, error
  associations, or field grouping; writes alt text or table captions; or
  debugs screen-reader or accessibility-tree output.
metadata:
  category: "Frontend & Accessibility"
  tags: "html,semantics,accessibility,a11y,aria,wcag,landmarks,forms,keyboard"
---

# Semantic HTML

Write HTML that is semantic, accessible, and structurally honest. Every element must earn its place on meaning and accessibility grounds, not appearance. The leading word is **accessible structure**: the bare meaningful skeleton of a page, where each element justifies itself by what it communicates to the accessibility tree.

## When to Use This Skill

- writing, reviewing, or refactoring any HTML markup
- choosing between semantic elements (`section`, `article`, `aside`,
  `nav`, `main`, `header`, `footer`, `form`, `button`, `a`, `p`,
  `h1`–`h6`, `ul`, `ol`, `li`, `dl`, `dt`, `dd`, `figure`,
  `figcaption`, `details`, `summary`, `dialog`, `table`, `th`, `td`,
  `caption`, `img`, `blockquote`, `hr`, `address`, `pre`, `code`,
  `em`, `strong`, `abbr`, `time`, `mark`, `cite`, `dfn`, `progress`,
  `meter`) and non-semantic fallbacks (`div`, `span`)
- auditing or fixing heading hierarchy and landmark structure
- applying or reviewing ARIA roles, states, and properties
- reviewing form labels, field grouping, or error associations
- checking keyboard accessibility, focus order, and skip links
- writing alt text, table captions, or accessible names
- debugging screen-reader or accessibility-tree output

Do not use this skill for:

- CSS layout, styling, or visual design decisions
- JavaScript behaviour unless the HTML or ARIA choice is the root issue
- template or component-framework syntax (Svelte, JSX, etc.) unless the HTML semantics within them are the subject
- content strategy, copywriting, or plain-text concerns

## Rules

### A. Core Principles

1. **Prefer semantic elements.**  Use the HTML element whose meaning matches the content (`section`, `article`, `aside`,
   `nav`, `main`, `header`, `footer`, `form`, `button`, `a`, `p`,
   `h1`–`h6`, `ul`, `ol`, `li`, `dl`, `dt`, `dd`, `figure`,
   `figcaption`, `details`, `summary`, `dialog`, `table`, `th`, `td`,
   `caption`, `img`, `blockquote`, `hr`, `address`, `pre`, `code`,
   `em`, `strong`, `abbr`, `time`, `mark`, `cite`, `dfn`, `progress`,
   `meter`). Do not use `div`/`span` when a semantic element is clearly better.

2. **Avoid semantic overfitting.**  Do not force a semantic element where a plain container is more accurate. A `div` is fine when no stronger semantic exists. Accuracy over mechanical compliance.

3. **Content and behaviour separate.**  HTML defines structure, CSS defines presentation, JavaScript defines behaviour. No inline
   `onclick=""` strings or inline styles.

4. **Keep nesting shallow.**  No unnecessary wrappers. Every extra layer must justify itself on structural, semantic, or accessibility grounds.

### B. Document Structure

1. **Source order must be logical.**  The reading and navigation order must make sense without CSS. Place content in DOM order so that screen-reader users encounter it in a meaningful sequence.

2. **Landmarks must be meaningful.**  Use `main`, `nav`, `header`,
   `footer`, `aside` where they help orientation. When multiple landmarks of the same type appear on a page, distinguish them with
   `aria-label` or `aria-labelledby`. Do not wrap every subsection in a landmark.

3. **Headings form a logical hierarchy.**  One `h1` per page or main view. Follow a clear order (`h1` → `h2` → `h3`). Do not skip levels without reason. Every sectioning element (`section`, `article`,
   `nav`, `aside`) should contain a heading that describes its content.

### C. Content Semantics

1. **Use lists only for actual lists.**  `ul`/`ol` for list semantics (steps, menu items, grouped items where list membership is the meaning). Do not use list markup just because content repeats.

2. **Use `article` for standalone entries.**  Use `article` when each repeated item can stand on its own — cards, posts, results, stories — with its own heading, metadata, or actions.

3. **Use native disclosure and status widgets.**  Prefer
   `<details>`/`<summary>` for collapsible sections, `<dialog>` for modals, `<progress>` for task completion, `<meter>`
   for scalar measurements. These expose state automatically to the accessibility tree.

### D. Images

1. **Images need intentional `alt`.**  `alt=""` for decorative images. Descriptive, concise `alt` text for informative images conveying information a sighted user would see and that matters in context. Use `figure`/`figcaption` when the caption is part of the content. Never include text as an image.

### E. Tables

1. **Data tables must be accessible.**  Use `<th>` with
   `scope="col"`/`scope="row"`. Provide a `<caption>` for the table's accessible name. Avoid using tables for layout.

### F. Links

1. **Link text must be meaningful out of context.**  No "click here",
   "read more", or "learn more" without disambiguation. The link text alone should convey its destination or purpose.

2. **External and file links need indicators.**  Announce when a link opens a new tab or downloads a file, either in the link text or via an icon with appropriate alt text.

3. **Skip links.**  Provide a skip-to-main-content link as the first focusable element on the page, linking to `#main`
   or equivalent.

### G. Interactive Elements & Forms

1. **Use correct interactive elements.**  `<button>` for actions,
   `<a href="...">` for navigation. Never use a clickable `div` or
   `span` as a button or link. If a non-interactive element must play an interactive role, add `role`, `tabindex`, and keyboard event handling.

2. **Forms must be explicit.**  Every input needs an associated
   `<label>`. Use `fieldset`/`legend` for grouped controls (radio groups, address blocks). Mark required fields with the
   `required`
   attribute, not only text. Do not rely on `placeholder` as a label.

3. **Error messages associate with input.**  Link error text to the input via `aria-describedby`. Errors must be perceivable and programmatically associated.

4. **No cognitive tests for authentication.**  Do not require users to solve puzzles, identify objects, or transcribe content for login. Provide accessible alternatives.

### H. Focus & Keyboard

1. **Focus must not be obscured.**  Keyboard focus indicators must not be hidden by sticky headers, footers, overlays, or other elements (WCAG 2.2 AA: Focus Not Obscured).

2. **No keyboard traps.**  All focusable elements must be navigable away from using standard keyboard keys (Tab, Shift+Tab, Escape).

3. **Touch targets minimum 24×24 CSS pixels.**  Interactive elements must meet this size (WCAG 2.2 AA: Target Size Minimum).

### I. ARIA

1. **Four rules of ARIA.**
   a. Prefer native HTML elements and attributes over ARIA. b. Do not change native semantics unless absolutely necessary. If you need a tab, do not write
   `<h2 role="tab">`; use `<div role="tab"><h2>…</h2></div>`. c. All interactive ARIA controls must be keyboard usable. d. Never apply `aria-hidden="true"` or `role="presentation"` to a focusable element.

2. **Accessible names.**  Precedence: `aria-labelledby` > `aria-label` >
   native mechanism (`label`, `alt`, `caption`, `legend`) >
   `title`/`placeholder` fallback. Prefer visible text. Prefer native techniques. Do not include role names in accessible names (e.g.
   "Submit button" creates duplicate output — the role is announced automatically).

3. **Accessible state and properties.**  Use `aria-expanded` for toggleable sections, `aria-controls` to reference the controlled element, `aria-current` for the current item in a set,
   `aria-selected` for tab/listbox selection, `aria-hidden` to hide decorative or offscreen content from the accessibility tree (only on non-focusable elements).

4. **Live regions for dynamic content.**  Use `aria-live="polite"` for content that updates without user action (feeds, stock tickers). Use `aria-live="assertive"` sparingly for urgent, time-sensitive messages. Prefer `role="status"` and
   `role="alert"` over raw
   `aria-live`.

## Anti-Patterns

- using `div` for buttons or links
- using links with Javascript without `href` attribute but with click-handlers
- adding ARIA when native HTML already provides the semantics
- `aria-hidden="true"` or `role="presentation"` on a focusable element
- skipping labels on form inputs
- using `placeholder` as a substitute for `<label>`
- using headings for visual styling only
- wrapping card grids in `ul`/`li` by default
- using `section` without a heading
- deeply nested wrapper `div` chains
- using tables for layout
- "click here" / "read more" link text
- forcing a semantic element where it does not fit
- including the role name in an accessible name
- applying `aria-live` to regions that do not update dynamically

## Heuristics

- does every element have a reason to exist?
- would this structure make sense without CSS?
- can a screen reader parse the heading hierarchy?
- are landmarks present where they help, absent where they would be noise?
- is every interactive element reachable and operable by keyboard?
- does every form control have a visible, programmatically associated label?
- is every image's `alt` correct (descriptive or empty)?
- are ARIA attributes used only where native HTML cannot express the needed semantics?
- is the accessible name for every interactive element clear, concise, and free of role duplication?
- are dynamic content updates announced via appropriate live regions?
- are error messages associated with their inputs?
- would this pass a keyboard-only walkthrough?

## Output Guidelines

- start with semantic structure, not visual layout
- choose the element that most accurately reflects the content's meaning
- add ARIA only when native HTML cannot express the needed semantics
- prefer visible text labels over `aria-label` where possible
- keep the markup minimal — every element must earn its keep
- logical source order before visual reordering
- test with the accessibility tree, not just the DOM
