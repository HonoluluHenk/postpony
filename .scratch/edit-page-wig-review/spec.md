# Edit page: Web Interface Guidelines compliance

**Status:** ready-for-agent

## Problem Statement

The organizer's edit page for a Postponement was reviewed against the Vercel Web Interface Guidelines (accessibility, forms, typography, content handling, locale, theming). The review found ~25 issues. Most are small, but together they degrade the experience for screen-reader users (whole sections re-announced on every HTMX swap, success notices shouted as alerts, table titles read twice), for mobile users (tiny language-select hit target, no `touch-action`, no `theme-color`), and for anyone comparing dates (heading and card dates use the typing format `07:45 pm` while tables use the reading format `7:45 PM`). Copy has a plural bug ("1 other games"), a stale footer year, an untranslated status value in German, and vague button labels.

## Solution

Bring the edit page into compliance with the guidelines, keeping the current visual design and information architecture. After the change:

- Assistive tech hears one short status message per action ("Player added", "Proposed date added", "Copied to clipboard") instead of the whole section, and the organizer-password notice is a polite status rather than an alert.
- All displayed dates use the locale's reading format via `Intl`; only text inputs keep the locale's typing (token) format.
- Vote tables show their title once; numeric columns use tabular numerals and are right-aligned.
- Buttons say what they do ("Confirm Date", "Refresh Schedule Check"); counts pluralize correctly; the status chip is translated.
- Page shell gains `theme-color`, logo dimensions, a ≥24px language selector with explicit colors, `touch-action: manipulation`, balanced headings, and a current footer year.
- Form inputs declare `autocomplete` and `inputmode`; delete dialogs contain overscroll; long player names wrap.

Three findings are intentionally deferred (see Out of Scope).

## User Stories

1. As a screen-reader user, I want each HTMX action on the edit page to announce one short outcome, so that I am not read the entire Proposed Dates section after every click.
2. As a screen-reader user, I want the organizer-password notice announced politely (status), so that a success message does not interrupt me like an emergency.
3. As a screen-reader user, I want to hear "Copied to clipboard" after pressing a copy button, so that I know the invitation link is in my clipboard.
4. As a screen-reader user, I want each vote table's title read once, so that I am not confused by a heading and caption with identical text.
5. As a screen-reader user, I want each Proposed Date card exposed as a named group, so that its clash label actually reaches me (an unlabeled `div` is ignored).
6. As an organizer, I want the heading, match summary, and Proposed Date cards to show dates the same way as the vote tables (e.g. `Tu, Sep 15, 2026, 7:30 PM`), so that I read one consistent format across the page.
7. As an organizer, I want the add-date and generator inputs to keep the locale's typing format as placeholder and prefill, so that I know exactly what to type.
8. As an organizer, I want vote counts in aligned tabular numerals, so that I can compare Yes/Maybe/No columns at a glance.
9. As an organizer, I want the "Confirm" button to say "Confirm Date", so that I know what I am confirming.
10. As an organizer, I want the venue occupancy chip to say "1 other game" when there is exactly one, so that the copy reads correctly.
11. As a German-speaking organizer, I want the status chip to read "Status: Abstimmung" rather than "Status: Voting", so that the whole page is in my language.
12. As a mobile user, I want the language selector to be at least 24px tall, so that I can tap it reliably.
13. As a mobile user, I want `touch-action: manipulation` on the page, so that taps respond without the double-tap zoom delay.
14. As a mobile user, I want the browser chrome color to match the page background, so that the app feels integrated.
15. As a Windows dark-mode user, I want native selects to declare background and text color, so that they remain legible.
16. As a user on a narrow screen, I want the three-line page heading balanced, so that it does not leave a single orphaned word on a line.
17. As a user, I want the logo image to declare both width and height, so that the page does not shift while loading.
18. As a user, I want the footer to show the current year, so that the site does not look abandoned.
19. As an organizer, I want player-name fields to opt out of browser autofill, so that my password manager does not pop up on a plain name field.
20. As an organizer on a phone, I want time and date fields in numeric locales to open a numeric keypad, so that entering `19:30` is fast.
21. As an organizer, I want delete-confirmation dialogs to contain scrolling, so that scrolling inside the dialog does not scroll the page behind it.
22. As an organizer, I want very long player names to wrap inside their list row, so that they do not overflow the card.
23. As an organizer, I want the "Refresh schedule check" button in Title Case like other buttons, so that button labels are consistent.
24. As a maintainer, I want all of the above covered by component-render and e2e tests, so that guideline regressions are caught in CI.
25. As a maintainer, I want the German locale file kept in sync with every new or changed English key, so that no untranslated fallbacks appear.

## Implementation Decisions

**Grouping.** Work lands as six independent commits (page shell; edit-page notices and copy feedback; Proposed Dates section; team section; vote tables; locale/copy) plus a final verify pass. Tickets are drafted in the companion issues folder.

**Live regions.** Remove `aria-live` from the four large swap targets (team management, proposed-dates management, own-team votes, vote tally). Add one visually-hidden `role="status"` element to the initial edit-page render, always present (partial-vs-initial rule). Partials update it out-of-band with a short outcome message supplied by the handler; existing success-message translation keys are reused where they fit. Existing focus-to-heading behaviour on swap is unchanged.

**Notices.** Organizer-password toast becomes `role="status"`; the password value is wrapped with `translate="no"`. Copy buttons carry a translated "copied" label as a data attribute; the client-side clipboard handler writes it into a shared visually-hidden status element for ~2 s alongside the existing icon swap.

**Dates.** Display strings (page heading, match summary, Proposed Date card short display) switch to the locale-aware `Intl` formatter already used by the vote tables. The prop that currently feeds both the heading and the add-date input prefill is split: display gets an Intl-formatted value, the input keeps the token-format value. The short card formatter is redefined to use `Intl` short date + short time instead of locale tokens.

**Proposed Date cards.** Card wrapper gains `role="group"` so its existing `aria-label` is exposed. Time inputs get `inputmode="numeric"` for 24-hour locales only, decided by a typed property on the locale config (not an inline locale check); From/To date inputs get `inputmode="numeric"` in all locales. Dialog rule gains `overscroll-behavior: contain`.

**Team section.** All player-name input variants get `autocomplete="off"`. Player-name cells get `min-width: 0` and `overflow-wrap: anywhere`.

**Vote tables.** Table `<caption>` is visually hidden (heading remains the visible title; accessible name preserved). Numeric header/data cells get a `num` class styled with `font-variant-numeric: tabular-nums; text-align: end`. Missing list `key` on player header cells is added.

**Page shell.** `<meta name="theme-color">` uses the light-surface design token. Logo `<img>` gets `width` computed from the SVG aspect ratio at height 40. Language select: `min-height: 24px`, explicit `background-color`/`color` from design tokens. `body { touch-action: manipulation }`. Headings get `text-wrap: balance`. Footer year is computed at render.

**Locale/copy.** New keys: `copied_to_clipboard`, `venue_occupancy_line_one`, `status_draft`, `status_voting`, `status_confirmed` (en + de). Changed: `confirm_date` to "Confirm Date" / "Termin bestätigen", `clash_check_refresh` to "Refresh Schedule Check". The status chip translates the enum value through the new keys before interpolating into `status_label`. Occupancy chip picks the singular key when count is 1; follow any existing plural convention in the localization skill if one exists.

**ADRs respected.** JSX templates (ADR 0019), locale resolution (ADR 0016), HTMX partial/initial render rule, `<section>` must start with a heading (so the heading, not the caption, stays visible).

## Testing Decisions

**Seams.** No new seams. Two existing seams:

1. Component render: `renderToString` on the JSX components (existing `*.spec.tsx` pattern) asserting rendered attributes and text: roles, `translate`, `autocomplete`, `inputmode`, class names, caption/heading text, Intl-formatted dates, translated status, plural copy.
2. End-to-end: Playwright via the `EditPage` page object and `checkA11y`: status announcement after add-player / add-date / delete, copy-button status text, "Confirm Date" locator, heading date format, no horizontal overflow, language select size. Client clipboard behaviour extends the existing browser-project spec for the UI module.

**Good test.** Asserts what the user or assistive tech perceives (accessible name, role, visible text, announced text), never internal prop plumbing. One assertion per guideline rule; no snapshot of whole HTML.

**Prior art.** Existing edit-page, proposed-dates-section, team-section, own-team-votes component specs; edit-handlers spec for handler-level rendering; `postponement-editing`, `proposed-date-generator`, `join-voting` e2e suites; `ui.spec.js` clipboard test.

**Coverage.** Stay ≥ 80% on all metrics. Update existing assertions that hard-code the old token-format display (`07:30 pm`), the old "Confirm" label, or `2024`.

## Out of Scope

- Replacing the language `<select>` with per-language links (deep-linkable, middle-clickable). Deferred; current inline navigation stays.
- Collapsing 26 per-card delete dialogs into one shared dialog.
- `beforeunload` guard for the unsaved generator form.
- Virtualization of Proposed Date lists (under the 50-item threshold).
- Any visual redesign; BeerCSS vendor CSS untouched.
- Join/vote page (participant side) review; only the organizer edit page was audited.

## Further Notes

- Source review: Vercel Web Interface Guidelines, fetched live from the `vercel-labs/web-interface-guidelines` repo on the review date.
- Findings that already pass and must stay passing: skip link, heading hierarchy h1–h4, `aria-label` on all icon buttons, delete confirmation dialog, 52×32 switch target, focus rings, `prefers-reduced-motion`, no `transition: all`, no `outline: none`, language detection via `Accept-Language`.
- The live-region refactor has the widest blast radius (four components, several handlers). Land it last among the code commits so the small fixes are not held hostage.
