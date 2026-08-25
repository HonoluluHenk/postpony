# 04: Spinner activation rules are covered

**What to build:** Every branch of "should this interaction raise the loading spinner?" is asserted in the browser project, so removing an opt-out or an HTMX attribute from the rule fails in seconds instead of shipping. A plain submit button and a link styled as a button activate the spinner; the explicit opt-out attribute, each of the five HTMX method attributes, a fragment-only href, a missing href and a new-tab target all suppress it. The HTMX-driven predicate is asserted on its own, so the submit path and the click path demonstrably rest on one verified rule. A restored page from the back/forward cache never keeps a stuck spinner.

**Blocked by:** 03 (Vitest browser project runs a first real spec).

**Status:** ready-for-agent

- [ ] Table-driven assertions over the should-show predicate: submit button and link-as-button activate
- [ ] Each suppressing case asserted individually — opt-out attribute, `hx-get`, `hx-post`, `hx-put`, `hx-delete`, `hx-patch`, fragment-only href, missing href, new-tab target
- [ ] The HTMX-driven predicate is asserted independently of the should-show predicate
- [ ] The page-restore path hides an already-active spinner
- [ ] Where a real event dispatch is unavoidable, a capturing default-preventing listener is registered first so the test frame never navigates
- [ ] Assertions are on observable state and return values — never on listener registration or internal calls
