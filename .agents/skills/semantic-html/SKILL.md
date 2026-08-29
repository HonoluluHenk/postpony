---
name: semantic-html
description: >-
    Enforces accessible structure in HTML — semantic element choice, nesting,
    heading hierarchy, landmarks, form labeling, links, keyboard interaction,
    focus management, and ARIA.  Use when the user writes, reviews, or refactors
    HTML for accessibility; chooses between `section`, `article`, `aside`, `nav`,
    `div` and other elements; checks heading or landmark structure; reviews form
    labels, field grouping, or error associations; audits keyboard accessibility
    or focus order; writes alt text or table captions; applies or reviews ARIA
    roles, states, and properties; or debugs screen-reader or accessibility-tree
    output.
metadata:
    category: Frontend & Accessibility
    tags: html,semantics,accessibility,a11y,aria,wcag,landmarks,forms,keyboard,svg,tables
---

# Semantic HTML

Write HTML that is semantic, accessible, and structurally honest. Every element must earn its place on meaning and accessibility grounds, not appearance. The leading word is **accessible structure**: the bare meaningful skeleton of a page, where each element justifies itself by what it communicates to the accessibility tree.

## When to Use This Skill

- writing, reviewing, or refactoring any HTML markup
- choosing between semantic elements and `div`/`span` fallbacks (full element list in rule A.1)
- auditing or fixing heading hierarchy and landmark structure
- applying or reviewing ARIA roles, states, and properties
- reviewing form labels, input types, field grouping, or error associations
- checking keyboard accessibility, focus order, and skip links
- writing alt text, icon/SVG names, table captions, or accessible names
- debugging screen-reader or accessibility-tree output

Do not use this skill for:

- CSS layout, styling, or visual design decisions (including colour contrast, reflow, and reduced motion)
- JavaScript behaviour unless the HTML or ARIA choice is the root issue
- template or component-framework syntax (Svelte, JSX, etc.) unless the HTML semantics within them are the subject
- content strategy, copywriting, or plain-text concerns

## How to Use This Skill

1. **Read the markup in source order.**  Map the landmarks, the heading outline, and the focus order before judging anything.
2. **Walk the rules section by section** (A–I below). For each violation, record where it is, which rule it breaks, and a concrete fix.
3. **Verify what you claim.**  Confirm accessible-name, ARIA, and keyboard claims against the accessibility tree or a keyboard-only walkthrough where you can — do not assert conformance you have not checked.
4. **Present the results** using the template under Present Results to User.

When writing new markup rather than reviewing, work in the same order: build the semantic skeleton and a logical source order first, give every interactive control an accessible name, and leave presentation to CSS.

Completion criterion: every rule in sections A–I has been checked against the markup, and each finding names the offending element plus a concrete fix. If any part is unverifiable, say so rather than assuming it passes.

## Rules

Each rule is the single source of truth for its topic; the offending markup and its correction live beside it. For worked before/after snippets per section, read `references/examples.md`. For the exact WCAG 2.2 criteria, the target-size exceptions, the accessible-name algorithm, and ARIA attribute details, read `references/wcag-and-aria.md`
when a finding needs to cite a criterion or handle an edge case.

### A. Core Principles

1. **Prefer semantic elements.**  Use the HTML element whose meaning matches the content (`section`, `article`,
   `aside`, `nav`, `main`, `header`, `footer`, `form`, `button`, `a`, `p`, `h1`–`h6`, `ul`, `ol`, `li`, `dl`, `dt`,
   `dd`, `figure`, `figcaption`, `details`, `summary`, `dialog`, `table`, `th`, `td`, `caption`, `img`, `blockquote`,
   `hr`, `address`, `pre`, `code`, `em`, `strong`, `abbr`, `time`, `mark`, `cite`, `dfn`, `progress`, `meter`). Reach for `div`/`span` only when no semantic element fits.

2. **Avoid semantic overfitting.**  Do not force a semantic element where a plain container is more accurate. A `div`
   is fine when no stronger semantic exists. Accuracy over mechanical compliance.

3. **Content and behaviour separate.**  HTML defines structure, CSS defines presentation, JavaScript defines behaviour. No inline `onclick=""` strings or inline styles; build the semantic structure before any layout.

4. **Keep nesting shallow.**  No unnecessary wrappers. Every extra layer must justify itself on structural, semantic, or accessibility grounds.

### B. Document Structure

1. **Source order must be logical.**  The reading and navigation order must make sense without CSS. Place content in DOM order so that screen-reader users encounter it in a meaningful sequence, before any visual reordering.

2. **Landmarks must be meaningful.**  Use `main`, `nav`, `header`, `footer`, `aside` where they help orientation. When multiple landmarks of the same type appear on a page, distinguish them with `aria-label` or `aria-labelledby`. Do not wrap every subsection in a landmark.

3. **Headings form a logical hierarchy.**  One `h1` per page or main view. Follow a clear order (`h1` → `h2` → `h3`); do not skip levels without reason, and never pick a heading level for its visual size. Every sectioning element (`section`, `article`, `nav`, `aside`) should contain a heading that describes its content.

4. **Declare the language and direction.**  Set `lang` on `<html>` and on any content that switches language, so screen readers pronounce text correctly. Set `dir` when the base direction is right-to-left.

### C. Content Semantics

1. **Use lists only for actual lists.**  `ul`/`ol` for list semantics (steps, menu items, grouped items where list membership is the meaning). Do not wrap merely decorative or repeating content in `ul`/`li` when list membership carries no meaning.

2. **Use `article` for standalone entries.**  Use `article` when each repeated item can stand on its own — cards, posts, results, stories — with its own heading, metadata, or actions. For a genuine list of such entries, nest them as
   `li > article`.

3. **Use native disclosure and status widgets.**  Prefer `<details>` / `<summary>` for collapsible sections,
   `<dialog>` for modals, `<progress>` for task completion, `<meter>` for scalar measurements. These expose state automatically to the accessibility tree.

### D. Images & Icons

1. **Images need intentional `alt`.**  `alt=""` for decorative images. Descriptive, concise `alt` text for informative images conveying information a sighted user would see and that matters in context. Use `figure`/`figcaption` when the caption is part of the content. Never render text as an image.

2. **Icons and inline SVG carry a name or are hidden.**  An inline `<svg>` that conveys meaning needs `role="img"` plus a `<title>` (or `aria-label`); a decorative icon or SVG gets `aria-hidden="true"`. An icon-only button needs an accessible name via `aria-label` or visually-hidden text — the glyph alone names nothing.

### E. Tables

1. **Data tables must be accessible.**  Use `<th>` with `scope="col"` / `scope="row"`, and provide a `<caption>` for the table's accessible name. For tables with multiple header levels or an irregular layout, associate each cell with its headers via `headers`/`id`. Never use tables for layout.

### F. Links

1. **Link text must be meaningful out of context.**  No "click here", "read more", or "learn more" without disambiguation. The link text alone should convey its destination or purpose.

2. **External and file links need indicators.**  Announce when a link opens a new tab or downloads a file, either in the link text or via an icon with appropriate alt text.

3. **Skip links.**  Provide a skip-to-main-content link as the first focusable element on the page, linking to `#main`
   or equivalent.

### G. Interactive Elements & Forms

1. **Use correct interactive elements.**  `<button>` for actions, `<a href="...">` for navigation. Never use a clickable
   `div` or `span`, or a bare `<a>` with a click handler but no `href` — neither is focusable or operable by keyboard. Give every `<button>` in a form an explicit `type` (`submit`, `button`, or `reset`); the default is
   `submit`. If a non-interactive element must play an interactive role, add `role`, `tabindex`, and keyboard event handling.

2. **Forms must be explicit.**  Every input needs an associated `<label>`. Use `fieldset`/`legend` for grouped controls (radio groups, address blocks). Mark required fields with the `required` attribute, not only text. Do not rely on
   `placeholder` as a label.

3. **Inputs declare their purpose.**  Choose the input `type` that matches the data (`email`, `tel`, `url`, `number`,
   `date`) so browsers validate and mobile keyboards adapt, and add the right `autocomplete` token (`name`, `email`,
   `username`, `current-password`, `new-password`) so browsers and password managers can fill (WCAG 2.2 AA: Identify Input Purpose).

4. **Error messages associate with input.**  Link error text to the input via `aria-describedby`, and mark the field
   `aria-invalid`. Errors must be perceivable and programmatically associated.

5. **Authentication must not require cognitive-function tests.**  Provide at least one authentication path that does not rely on a cognitive-function test — remembering a site-specific password, transcribing a code, or solving a puzzle (WCAG 2.2 AA: Accessible Authentication, Minimum). If a cognitive test is used, offer an alternative method, and never block paste or password-manager fill. Object-recognition tests are permitted at AA level; the strict "no cognitive tests at all" rule is AAA.

### H. Focus & Keyboard

1. **Focus must not be obscured.**  Keyboard focus indicators must not be hidden by sticky headers, footers, overlays, or other elements (WCAG 2.2 AA: Focus Not Obscured).

2. **No keyboard traps.**  All focusable elements must be navigable away from using standard keyboard keys (Tab, Shift+Tab, Escape).

3. **Touch targets meet the size or spacing rule.**  Interactive elements must be at least 24×24 CSS pixels, or be spaced so that a 24 px diameter circle centered on each target does not intersect a neighbor (WCAG 2.2 AA: Target Size, Minimum). Exceptions apply to inline links in a sentence, user-agent-controlled sizes, and essential targets — see the reference file for the full list.

4. **`tabindex` stays minimal.**  Use `0` for natively focusable elements and `-1` for programmatic focus. Never use
   `tabindex` greater than 0, and avoid `tabindex` on non-interactive content.

5. **Dialogs and overlays manage focus.**  Move focus into the dialog on open, keep it inside while open, and restore it to the trigger on close. Use `aria-modal="true"` on modal dialogs. Native `<dialog>` with `.showModal()` does this for you.

### I. ARIA

1. **Four rules of ARIA.**

   a. Prefer native HTML elements and attributes over ARIA — do not add ARIA when native HTML already provides the semantics. b. Do not change native semantics unless absolutely necessary. If you need a tab, do not write
   `<h2 role="tab">`; use `<div role="tab"><h2>…</h2></div>`. c. All interactive ARIA controls must be keyboard usable. d. Never apply `aria-hidden="true"` or `role="presentation"` to a focusable element.

2. **Accessible names.**  Precedence: `aria-labelledby` > `aria-label` > native mechanism (`label`, `alt`, `caption`,
   `legend`) > `title` / `placeholder` fallback. Prefer visible text and native techniques. Do not include role names in accessible names (e.g. "Submit button" creates duplicate output — the role is announced automatically).

3. **Accessible state and properties.**  Use `aria-expanded` for toggleable sections, `aria-controls` to reference the controlled element, `aria-current` for the current item in a set, `aria-selected` for tab/listbox selection,
   `aria-hidden` to hide decorative or offscreen content from the accessibility tree (only on non-focusable elements).

4. **Live regions for dynamic content.**  Use `aria-live="polite"` for content that updates without user action (feeds, stock tickers). Use `aria-live="assertive"` sparingly for urgent, time-sensitive messages. Prefer `role="status"`
   and `role="alert"` over raw `aria-live`, and do not put `aria-live` on regions that never update dynamically.

## Present Results to User

Group findings by rule section (A–I), worst first. For each finding:

```
**[Section] Rule name — severity**
- **Where:** file / selector / element
- **What:** the violation, in one sentence
- **Fix:** concrete corrected markup or behaviour
```

End with a one-line summary: overall pass/fail and the single worst issue to fix first. Never assert conformance for anything you did not verify.

## End-User Installation

```bash
npx skills add honoluluhenk/agent-skills --skill semantic-html
```

**Claude Code:**

```bash
cp -r skills/semantic-html ~/.claude/skills/
```

**claude.ai:**

Add the skill to project knowledge or paste SKILL.md contents into the conversation.
