# Spec: Unit-test the client-side JS in Vitest Browser Mode (and keep Playwright for e2e)

Status: ready-for-agent

## Problem Statement

The question "should we migrate the Playwright e2e suite to Vitest Browser Mode?" keeps coming up, and nothing in the repo answers it. Answering it costs an afternoon of research every time, and the wrong answer costs a rewrite of ~2,500 lines of specs and six page objects.

The investigation surfaced a second, real problem. The app ships roughly 330 lines of hand-written client-side JavaScript — the loading spinner and the page bootstrap that wires theme, language, HTMX, clipboard, delete dialogs, focus management and the proposed-date picker. That code is loaded as classic script tags exposing globals, so it cannot be imported. It has **no unit tests at all**, and because the coverage gate only looks at TypeScript sources it is invisible to the 80% threshold: a regression in it reports as 100% covered.

The behaviour hiding there is genuinely branchy — whether an HTMX error response body is worth swapping, whether a stored language should trigger a redirect without looping, whether a given click should raise the spinner, whether a dialog trigger injected by a later HTMX swap still opens its dialog. Today the only way to exercise any of it is a full browser round-trip against a running server, so most branches are simply never executed by any test.

## Solution

Two outcomes, one direction.

**Record the decision.** Vitest Browser Mode is component-testing infrastructure: each test file runs inside an iframe on the Vite dev server with the base path forced to the root, its `page` handle is explicitly *not* Playwright's page object (no navigation), and it offers no API request context and no browser-context control. This app's e2e value *is* the server round-trip — navigation, redirects, boosted full-page swaps, cookie fallbacks, malformed POST bodies, and axe-driven accessibility assertions. Browser Mode cannot drive any of it. A new ADR records the evaluation and its rejection, cross-referenced from the existing e2e-testing ADR, so the question stops resurfacing. Playwright remains the sole e2e driver and the e2e suite is not touched.

**Close the gap Browser Mode actually fits.** The client-side JS becomes importable ES modules — a thin entry that only bootstraps on window load, a shared UI module holding every init function, and the spinner module exporting its class plus the predicates that decide when it activates. A second Vitest project runs in headless Chromium against those modules, giving them a real `DOMParser`, a real `<dialog>`, real focus and a real clipboard API — no fake-DOM dependency, no jsdom shims. The coverage gate is extended to include client-side JavaScript, so from now on this code counts.

For the organizer using the app, nothing changes. For whoever touches the client-side JS next, a broken branch now fails in seconds instead of shipping.

## User Stories

1. As a maintainer, I want the "migrate e2e to Vitest Browser Mode?" question answered in an ADR, so that nobody re-researches it.
2. As a maintainer, I want the ADR to name the concrete blockers rather than a vague "it doesn't fit", so that the decision can be re-evaluated honestly if Browser Mode ever gains navigation.
3. As a maintainer, I want the existing e2e-testing ADR to point at the new one, so that the record is reachable from where the reader starts.
4. As a maintainer, I want the e2e suite, its page objects, its config and its npm script untouched, so that the accepted decision costs nothing to implement.
5. As a maintainer, I want the agent guidelines to name the two Vitest projects, so that an agent knows where a new test belongs without reading the config.
6. As a maintainer, I want the client-side JS importable as ES modules, so that its logic can be tested without booting a server.
7. As a maintainer, I want the page bootstrap to stay a separate, near-empty entry point, so that importing the UI logic in a test never triggers side effects.
8. As a maintainer, I want no test-only branches or hooks in the production client code, so that what runs in the browser is what the tests exercise.
9. As a maintainer, I want a single Vitest invocation to run both the node and the browser project, so that no new npm script and no new CI step appear.
10. As a maintainer, I want the browser project to reuse the Chromium binary the e2e suite already downloads, so that the change adds no new toolchain weight.
11. As a maintainer, I want exactly one new dev dependency, so that the install footprint stays honest.
12. As a maintainer, I want the coverage gate to include client-side JavaScript, so that the 80% threshold means what it claims.
13. As a maintainer, I want vendored third-party scripts and the bootstrap entry excluded from coverage, so that the number reflects code we wrote.
14. As a developer running the watch-mode test task, I want the browser project headless by default, so that no window pops up while I work.
15. As a developer, I want the HTMX error-swap decision covered as a pure function, so that I can change the out-of-band rules without a browser round-trip.
16. As a developer, I want the language-redirect decision covered as a pure function, so that the redirect-loop guard is provably intact.
17. As a developer, I want the spinner's activation rules covered as a predicate over an element, so that the submit path and the click path share one verified rule.
18. As a developer, I want each opt-out that suppresses the spinner asserted individually, so that removing one is caught immediately.
19. As a developer, I want the spinner's show and hide asserted on both classes and ARIA state, so that assistive-technology behaviour is not silently dropped.
20. As a developer, I want the back/forward-cache path asserted, so that a restored page never keeps a stuck spinner.
21. As a developer, I want the delete-dialog delegation tested against a real modal dialog, so that opening and dismissing is verified rather than mocked.
22. As a developer, I want a dialog trigger injected after initialization to still work in the test, so that surviving an HTMX swap is a tested property and not an assumption.
23. As a developer, I want the clipboard copy tested with a stubbed clipboard and fake timers, so that the icon revert is verified without a two-second wait.
24. As a developer, I want focus management tested for the main content region and each management region, so that keyboard users keep their place after a swap.
25. As a developer, I want non-element event targets asserted as ignored, so that focus management cannot throw on a text node.
26. As a developer, I want each init function proven to be a no-op when its vendor global is absent, so that a page loading a subset of the vendor scripts never errors.
27. As an organizer using the app, I want the page to behave exactly as before the refactor, so that the internal change is invisible to me.
28. As an organizer on a slow connection, I want the spinner, dialogs, clipboard and date picker to keep working after the script tags change, so that nothing regresses in the switch to module loading.
29. As a screen-reader user, I want the busy state and post-swap focus behaviour preserved, so that the accessibility commitment holds.
30. As a maintainer, I want the co-located client-side test files never served to the public and never uploaded as static assets, so that test code does not ship.
31. As a maintainer, I want that exclusion asserted by a request-level e2e assertion, so that a future restructure cannot silently start serving them.
32. As a reviewer, I want the module conversion and the coverage-include change to land alongside the first specs, so that the coverage number never dips below the gate on any commit.
33. As an agent picking up this work, I want the existing browser-driven specs named as the regression net for the script-tag change, so that I know which suite proves the conversion safe.

## Implementation Decisions

**Decision one: Playwright stays.**

- Vitest Browser Mode is rejected for end-to-end testing. The blockers, all verified against Vitest 4: test files execute inside an iframe served by the Vite dev server with the base path forced to the root; the exposed `page` handle is documented as *not* Playwright's page object and has no navigation; there is no API request context, which the error-handling and start-page suites both rely on; there is no browser-context handle, which the localization suite uses to prove the cookie fallback; and the axe integration backing the accessibility ADR is Playwright-bound.
- The e2e suite, its page objects, its Playwright config and the `e2e` npm script are out of scope. The only permitted e2e edit is one added request-level assertion (see below).
- A new ADR records the rejection and the adoption of Browser Mode for client-side units, following the existing Context / Decision / Rationale / Consequences shape. The e2e-testing ADR gains a "see also" line and keeps its Accepted status.
- The agent guidelines gain the two project names in the testing sections.

**Decision two: the client-side JS becomes ES modules.**

- The spinner module exports its class instead of assigning a global, and the attribute filter that both its submit and click listeners apply is extracted into two exported predicates: one answering "is this element HTMX-driven?", one answering "should a spinner be shown for this element?". This is the seam that makes the branchy activation logic testable without dispatching a real navigation.
- Every init function moves out of the bootstrap into a new shared UI module, exported, with no top-level side effects.
- Two impure spots gain a pure core, keeping the side effects in the caller:
    - a predicate over an HTMX error response body deciding whether it carries non-out-of-band content worth swapping;
    - a function taking the current query string, path, document language and stored language, returning either nothing (stay put) or the URL to navigate to. The assignment to the location stays in the init function; only the decision is extracted.
- The bootstrap entry keeps its asset URL and shrinks to imports plus the existing window-load listener, so the layout's script reference does not move.
- The layout's two classic script tags collapse into one module script. Module scripts are deferred and the code already waits for window load, so ordering is preserved; the vendor globals are still loaded by the classic head scripts that execute first, and every use of them is already guarded by a typeof check.
- The obsolete CommonJS globals and the spinner global entry are removed from the ESLint override for client-side JS.
- The client files stay JavaScript rather than becoming TypeScript: they are served raw and are not part of the SSR build, and the TypeScript project has neither JS support nor the DOM lib enabled.

**Decision three: a second Vitest project.**

- The Vitest config grows a `projects` array with two entries, both inheriting the root config so the path alias and a single coverage report are shared: a `unit` project (node environment, globals, type-checking, the existing TypeScript spec glob) and a `browser` project (the client-side JS spec glob, headless Chromium via the Playwright provider).
- Options that only apply per project — environment, globals, type-checking, include — move *inside* the projects, because root-level test options are ignored once projects are defined.
- Coverage stays at the root and is the only place the threshold lives. Its include list is extended to JavaScript; vendored scripts, spec files and the bootstrap entry are excluded.
- The provider package is the single new dev dependency. Its Playwright peer already resolves from the existing install and the Chromium binary is the one the e2e suite already uses.
- No new npm script: one Vitest run executes both projects, so the existing test and verify gates pick the browser project up for free.

**Decision four: spec files must not ship.**

- Client-side specs are co-located with the code they test, matching the existing co-located spec under the served asset root.
- Because the whole public directory is both served statically and uploaded as static assets, co-location needs two guards: an assets-ignore entry excluding spec files from the upload, and a one-line middleware before the static handler that returns a not-found for any asset path containing the spec marker. The shortcut is marked with a ponytail comment naming the upgrade path (move specs out of the served tree).
- One assertion is added to the existing start-page e2e spec, which already makes request-level asset assertions, proving a client-side spec file is not fetchable.

## Testing Decisions

**What makes a good test here.** Assert observable behaviour: the DOM state a user or assistive technology can perceive (classes, ARIA attributes, focus, dialog open state, clipboard content) and the return value of the extracted decision functions. Never assert that a listener was registered, that an internal helper was called, or the shape of intermediate markup. Each extracted predicate exists because it *is* the externally meaningful contract shared by two call paths — testing it is testing behaviour, not internals.

**Seams.** Three, of which only one is new:

- *Playwright browser seam* (existing, unchanged) — the whole-app regression net. It is what proves the script-tag conversion safe; the date-picker, focus-management, localization and responsive suites plus the delete-dialog flows in the editing suite all exercise the converted code in situ.
- *Vitest node seam* (existing, unchanged) — the server-side TypeScript specs. They only gain a project name.
- *Vitest browser seam* (new) — the ES-module boundary of the client-side JS, driven in headless Chromium. This is the highest seam available for this code: one import boundary per module, no per-function hooks, no DOM abstraction layer.

**Modules under test.** The spinner module and the shared UI module. The bootstrap entry is deliberately not tested — it is excluded from coverage precisely because it contains no decisions.

**Scenarios.**

- Spinner: show sets the active class, the non-hidden ARIA state, the busy state and the body loading class; hide reverses all four, including *removing* the busy attribute rather than setting it false. A table-driven pass over the activation predicate: a plain submit button and a link styled as a button both activate; each of the five HTMX method attributes, the explicit opt-out attribute, a fragment-only href, a missing href and a new-tab target all suppress. The HTMX-driven predicate is asserted independently so both listener paths rest on one verified rule. The page-restore listener hides an already-active spinner.
- UI logic: the error-swap predicate over a body with non-out-of-band content, an out-of-band-only body, a body with no out-of-band element at all, and an empty or whitespace-only body (must not throw). The language decision returns nothing when the query string already carries a language (loop guard) and when the stored value matches the document language, and returns the language-qualified URL when the stored value differs. Delete dialogs open and dismiss a real modal dialog, including a trigger injected after initialization. Clipboard copy writes the dataset value to a stubbed clipboard, swaps the icon, and restores it after the revert delay under fake timers. Focus management moves focus to the first heading of the main content region and of each management region, giving it a negative tab index, and ignores non-element targets. Each vendor-dependent init function is a no-op when its global is absent — cheap to assert in the browser project, where none of the vendor scripts are
  loaded.
- Where a real event dispatch is unavoidable, register a capturing default-preventing listener first so the test iframe never navigates.

**Prior art.** The co-located spec under the served asset root shows the co-location pattern. The existing server-side specs show the assertion style and the fixture-builder conventions. The start-page e2e spec shows the request-level asset assertion pattern reused for the not-found guard.

**Gates, in order.** Lint (type-check, e2e type-check, ESLint at zero warnings — it catches the obsolete globals and any stray CommonJS export), then the Vitest run with both projects and the coverage threshold, then the untouched Playwright suite. Finish on the full verify gate.

## Out of Scope

- Any change to the e2e specs, page objects, Playwright config or the e2e npm script — apart from the single not-found assertion added to the start-page spec.
- Rewriting the date-picker integration or duplicating its e2e coverage in the browser project.
- New npm scripts or CI steps.
- Converting the client-side JS to TypeScript.
- Testing the bootstrap entry, or asserting module load ordering in a unit test — the browser-driven suites cover that.
- Any server-side, model, route, locale or styling change.
- Replacing the axe accessibility integration or moving accessibility assertions into the browser project.
- Behaviour changes to the spinner, dialogs, clipboard, focus management or language handling: this is a refactor plus tests, not a feature.

## Further Notes

- The two directions were confirmed with the maintainer before this spec: keep Playwright and record why; convert both client files to ES modules; run their tests in a Vitest Browser Mode project; add JavaScript to the coverage include.
- Sequencing matters for the coverage gate. Adding JavaScript to the include list lowers the reported number until specs exist, so the module conversion, the include change and the first specs belong in one uninterrupted commit sequence.
- The riskiest single edit is the script-tag change, because it alters execution timing. Run the browser-driven suites straight after the conversion, before writing any new spec.
- Coverage in the browser project needs a Chromium-based instance for the V8 provider — which is what the configuration pins, and the same binary the e2e suite uses.
- Should Vitest Browser Mode ever gain real navigation and an API request context, the new ADR is the place to revisit this; the rejection is dated and reasoned, not dogmatic.
