# WCAG & ARIA Reference

Deep detail behind the rules in `SKILL.md`. Loaded on demand — read this file when a finding needs to cite a criterion, an exception, or an edge case.

## WCAG 2.2 AA criteria the rules cite

- **1.1.1 Non-text Content** — every non-text element needs a text alternative (image `alt`; `aria-label` /
  `aria-labelledby` for icons and SVG). Purely decorative → `alt=""`.
- **1.3.1 Info and Relationships** — structure (headings, lists, tables, labels) is programmatically determinable.
- **1.3.5 Identify Input Purpose** — name, email, phone, and password fields use the appropriate `autocomplete` token so browsers and password managers can fill them.
- **2.1.2 No Keyboard Trap** — focus can always move away with standard keys.
- **2.4.4 Link Purpose (In Context)** — link text (with context) conveys the destination.
- **2.4.11 Focus Not Obscured** — the focus indicator must not be fully hidden by sticky headers, footers, or other content. (2.4.12, the minimum-area variant, is AAA.)
- **2.5.8 Target Size (Minimum)** — targets are at least 24×24 CSS pixels, *or* undersized targets are spaced so that a 24 px diameter circle centered on each does not intersect another target or its circle. Five exceptions:

    1. **Spacing** — the circle test passes.
    2. **Equivalent** — another control on the page provides the same function and meets the size.
    3. **Inline** — the target is in a sentence, or its size is constrained by the line-height of non-target text.
    4. **User Agent Control** — the size is the browser default, not modified by the author (e.g. scrollbars,
       `<input type="date">` calendar).
    5. **Essential** — the presentation is essential to the information conveyed (e.g. map pins, dense data visualizations).

  The criterion does not apply to targets obscured by content shown after a user interaction (dropdowns, modal dialogs, banners) — but it does apply to that newly shown content itself.

- **3.3.8 Accessible Authentication (Minimum, AA)** — a cognitive-function test (remembering a site-specific password, transcribing a code, solving a puzzle) is not required for any step of an authentication process *unless*
  at least one of these is provided: an alternative method that is not a cognitive test, a mechanism that assists the user (password managers, copy/paste), or the test is object recognition / personal content. Blocking paste or password-manager fill fails this criterion.
- **3.3.9 Accessible Authentication (Enhanced, AAA)** — no cognitive-function tests at all, including object recognition. Stricter than AA; only adopt it as a product decision.
- **4.1.2 Name, Role, Value** — every control exposes a name, role, and value programmatically.

## Accessible names

Computed in this order (first non-empty wins):

1. `aria-labelledby`
2. `aria-label`
3. native mechanism — `<label>`, `alt`, `<caption>`, `<legend>`
4. `title` (and `placeholder` for textboxes) — last resort, unreliable, avoid

Pitfalls:

- Never include the role in the name: "Submit button" reads as "Submit button button".
- `placeholder` is not a label — it disappears when filled and names nothing reliably.
- For links and buttons the visible text is the name — keep them in sync, or point `aria-labelledby` at the visible text.

## ARIA states & properties quick table

| Attribute                        | Use for                                    | Notes                                          |
|----------------------------------|--------------------------------------------|------------------------------------------------|
| `aria-expanded`                  | disclosures, menus, accordions             | toggle with the control                        |
| `aria-controls`                  | reference the element a control affects    | idref, usually on the trigger                  |
| `aria-current`                   | current item in a set                      | values: page, step, location, date, time, true |
| `aria-selected`                  | tab/listbox/grid current selection         | distinct from focus                            |
| `aria-hidden="true"`             | decorative or offscreen content            | never on focusable elements; hides from all AT |
| `aria-invalid`                   | errored form fields                        | "true" / "grammar" / "spelling"                |
| `aria-required`                  | required fields without native `required`  | prefer native `required`                       |
| `aria-describedby`               | error or helper text for a control         | one or more idrefs                             |
| `aria-labelledby` / `aria-label` | accessible names when native is impossible | labelledby points at visible text              |
| `aria-live`                      | dynamic regions                            | polite / assertive; prefer the roles below     |
| `role="status"`                  | polite live region                         | announced on change                            |
| `role="alert"`                   | assertive live region                      | announced on insert                            |
| `aria-modal="true"`              | modal dialogs                              | on the dialog container                        |
| `aria-haspopup`                  | control that opens a menu/dialog/listbox   | menu, dialog, listbox, grid, tree, true        |
| `aria-valuenow` etc.             | non-native sliders/progress                | use native elements when possible              |
| `aria-busy`                      | region still loading                       | avoid long-lived busy states                   |

## Keyboard patterns

- **Dialog** — Escape closes; focus moves to the dialog on open, stays inside (Tab is contained), and returns to the trigger on close.
- **Tabs** — arrow keys move between tabs, Tab moves into the panel, Home/End jump to first/last.
- **Disclosure** — Enter/Space toggles; the trigger holds `aria-expanded`.
- **Combobox / autocomplete** — arrow keys navigate options, Enter selects, Escape closes; do not hijack Tab from the input.

## Focus & `tabindex`

- Only `0` (naturally focusable) and `-1` (programmatically focusable). Never
  `tabindex` greater than 0.
- Do not add `tabindex` to non-interactive content just to make it
  "focusable".
- Modals: focus the dialog on open, contain focus, restore on close. Native
  `<dialog>` + `.showModal()` handles this for you.
- The accessibility tree, not the DOM, is the source of truth for what assistive-technology users actually encounter.

## Language

- Set `lang` on `<html>`; declare a change with `lang` on the element where the language switches.
- Use proper `autocomplete` tokens for auth fields (`username`,
  `current-password`, `new-password`, `email`, etc.).
