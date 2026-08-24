# Spec: JSX server-side rendering (replace Eta with `hono/jsx`)

Status: ready-for-agent

## Problem Statement

Rendering a page in PostPony is the one place where the codebase stops being typed and starts being fragile.

- The render call takes a template *name* as a string and an *untyped* object. Renaming a field on a postponement, a proposed date, or a vote does not break the build; it silently produces a blank cell in the vote tally or an empty section on the edit page.
- The templating engine assumes a filesystem. Cloudflare Workers has none. Bridging that gap costs a codegen script, a committed generated artifact with five path-alias keys per template, a dual-mode runtime loader (with `new Function`, a lint suppression and a cast through `unknown`), a three-mode config knob wired in two places, and two spec files whose only subject is the loader itself.
- The committed artifact is a drift hazard: unit tests render from the checked-in artifact, so editing a template without re-running the codegen makes tests assert against stale HTML.
- The template language forces workarounds a real language does natively: dynamic heading tags spliced from strings, boolean attributes emitted as `'checked'` or `''`, whole attributes raw-injected behind a conditional, and the translation function re-passed by hand into every partial.

The templates themselves are not the problem — 18 files, ~900 lines, with handlers that already build properly typed view-models. The *handling* is the problem, and almost all of it is Workers-compatibility tax.

## Solution

Render with `hono/jsx`, which ships inside the already-installed `hono` package, and delete the scaffolding that only existed because the old engine needed a filesystem. This is a net dependency *removal*.

From the user's perspective (the user here is the developer maintaining PostPony):

- Views are ordinary functions taking typed props. A wrong or missing prop is a lint failure, not a blank cell in production.
- Editing a view and running the tests needs no build step in between.
- Deploying to Workers involves no runtime decision about where views come from, and no view-layer filesystem reference in the bundle.
- The partial-vs-initial-render invariant becomes structural: an HTMX partial and the initial page render the *same component*, so they cannot drift apart by forgetfulness.

Nothing changes for the end user of the app. HTML output must be behaviourally identical — same elements, ids, ARIA roles, CSS classes and HTMX attributes. The existing Playwright suite is what proves it.

## User Stories

1. As a developer, I want a renamed or removed model field to fail `npm run lint`, so that I find out at build time instead of seeing a blank cell in the vote tally.
2. As a developer, I want the props of every view to be a declared interface, so that I can see at the call site what a view needs.
3. As a developer, I want to reuse the existing view-model builders (edit partials data, proposed-date tally items, own-team view, vote tally items) directly as prop types, so that there is one shape per concept rather than two.
4. As a developer, I want to edit a view and immediately run `npm test`, so that I never assert against stale generated HTML.
5. As a developer, I want no codegen step before a build, so that `npm run build` is a single command with no ordering trap.
6. As a developer, I want no committed generated view artifact in the repo, so that reviews show intent rather than machine output.
7. As a developer deploying to Workers, I want no runtime branch deciding where views come from, so that local, Node-built and Workers behaviour are identical by construction.
8. As a developer deploying to Workers, I want the bundle to contain no view-layer filesystem reference, so that a Workers-incompatible import cannot creep back in.
9. As a developer, I want the config surface to shrink by the template-source knob and its two wiring sites, so that there is one fewer setting to explain and to get wrong.
10. As a developer, I want the lint suppression for implied `eval` and the cast through `unknown` gone, so that the strict-lint baseline has no exceptions in the view layer.
11. As a developer, I want a dynamic heading level expressed as a tag variable, so that heading hierarchy is not string splicing.
12. As a developer, I want boolean attributes such as the opponent-votable toggle expressed as booleans, so that I cannot emit a stray empty attribute.
13. As a developer, I want conditional attributes such as an ARIA label reference expressed as a value-or-undefined, so that no attribute is raw-injected into markup.
14. As a developer, I want the translation function passed as an ordinary prop, so that a nested partial cannot silently lose it.
15. As a developer, I want escaping on by default, so that a player name containing markup cannot become an injection because someone reached for the unescaped tag.
16. As a developer, I want an accidentally `async` view to be a compile error, so that a page can never render `[object Promise]`.
17. As a developer, I want the layout-versus-partial choice made explicitly at the call site, so that I can read from a handler whether it returns a document or a fragment.
18. As a developer, I want an HTMX partial and the initial page load to share one component, so that the known partial-vs-initial parity gotcha stops being a convention I have to remember.
19. As a developer, I want the out-of-band companions (status chip, vote-tally section, own-team votes, error container) to be sibling components of the section they accompany, so that adding a companion is a local change.
20. As a developer, I want the Node build output to contain the views like any other bundled module, so that the documented "no templates in the built output" caveat disappears.
21. As a developer, I want the e2e suite to pass with zero edits, so that I have evidence the HTML did not drift.
22. As a developer, I want accessibility checks to stay green on every page, so that the conversion cannot regress roles, labels or landmarks.
23. As a developer, I want all four locales to render as before, so that the conversion does not touch the translation contract.
24. As a developer, I want error rendering to keep working for both a full page and a partial swap, so that failures surface the same way in both paths.
25. As a developer, I want coverage to stay at or above 80% on all metrics with views in scope, so that view branches are actually exercised rather than merely present.
26. As a maintainer, I want the decision recorded in an ADR that supersedes the existing templating ADR, so that the next person does not re-litigate it.
27. As a maintainer, I want the agent guidance and context docs to describe the render call as it now is, so that agents stop generating template-engine code.
28. As a maintainer, I want the alternative that was rejected recorded with its reason, so that "why not a static JSX generator?" is answered once.

## Implementation Decisions

**Engine.** `hono/jsx`, from the already-installed `hono` dependency. No new runtime dependency; the old engine is removed from the manifest. Views compile to plain function calls, so there is no filesystem access, no codegen, no runtime loader and no config knob.

**Rejected alternative.** A build-time static JSX generator (NakedJSX) is ruled out on category, not quality: it writes HTML files at build time and has no per-request rendering API. PostPony renders per-request, per-postponement, per-locale HTML — vote tallies, player lists, HTMX fragments keyed to a session id — none of which exists at build time.

**Migration style: big-bang.** No dual-render seam and no coexistence period; the old engine is removed in the same change. Consequence, accepted: the tree does not typecheck mid-flight, because changing the render signature breaks every unconverted handler. The conversion is ordered so all render call sites are migrated before the verify gate runs.

**Render seam.** The render method takes a JSX node and returns a string. The parameter is deliberately narrowed to the *non-promise* arm of the JSX element type, so an `async` view is a compile error rather than a promise stringified into the page. Responses stay buffered strings; streaming is not used.

**Ambient view values.** The values previously merged into every render payload — translation function, locale, partial flag, base URL, locale input format, language options — are exposed by the app object as one view-context value and spread into page props at the call site. They are passed as explicit props, not through JSX context providers: there are only a handful of them, and a provider would add a file plus provider setup to every unit test for no gain.

**Layout and partial.** The engine-level layout with its internal partial branch is replaced by two components — a full-document layout and a partial counterpart carrying the out-of-band error container and the same content wrapper — plus one helper that makes the partial-versus-full choice in a single place.

**Component inventory.** One component file per former template, colocated with its route handler exactly as today; only the extension changes. That covers the start page, the error page, the shared error container, the vote tally and vote player results partials, the create form (create and change modes), the four scrape wizard steps, the edit page with its proposed-dates, team and own-team-votes sections, and the join, vote and confirmed-info views. Out-of-band companions become siblings of the section they accompany, so partial and initial renders share one source.

**Props contracts.** No model changes. The existing view-model builders are reused verbatim as prop shapes — this is what makes the conversion mechanical. Section props extend the corresponding view-model interface plus the view context, adding only the per-render extras (session id, status, reopen count, error text, success flag).

**Template idioms mapped.** Dynamic heading tag → tag held in a variable. Boolean attribute → boolean prop. Conditional attribute → value-or-`undefined`. Partial include with hand-passed translation function → child component with an explicit prop. Raw body injection → children. No unescaped-output escape hatch is needed anywhere in the conversion.

**Deletions.** The old engine dependency, the codegen script, the generated artifact, the dual loader and its two spec files, the codegen npm script, the template-source config key and its Workers variable in both wiring sites, the engine entry in the bundler's externals, and the codegen script's entry in the lint config's default-project allowance. The build script becomes a plain bundler invocation, which the e2e-build and start-build scripts inherit.

**Toolchain.** TypeScript gains the automatic JSX transform pointed at `hono/jsx`. Lint config lints `.tsx` with the same strict and stylistic type-checked rule sets, and the spec-file relaxation widens to `.tsx` specs. The test runner's include and coverage include widen to `.tsx`.

**Unchanged.** Routes, validation, session store, security model (owner password for edit, invitation password for join via token), locale resolution and its input formats, CSS, HTMX attribute usage and default swap behaviour, and the zero-SPA stance — no client-side JSX, no hydration.

**Documentation.** A new ADR records the decision; the existing templating ADR is marked superseded with cross-links both ways. The agent guidance file (project structure tree, framework patterns, quick-reference commands, config key list), the context doc, and the route-handlers skill are updated wherever they mention the template engine or the template-source knob.

## Testing Decisions

**What makes a good test here.** The contract of this change is "identical behaviour, less machinery", so a good test asserts what a browser or an HTMX swap would observe: elements, ids, roles, labels, attribute values, rendered text. A bad test asserts *how* rendering happened — the arguments handed to the render call, a template name, or which component was chosen. Every existing test that asserts the shape of a render call is therefore a test to rewrite, not to preserve.

**Seams (agreed).** Three, highest-first:

1. **The e2e suite, unmodified.** The Page Objects encapsulate every selector, so a correct conversion needs zero e2e edits. Any e2e change that is not selector-neutral is a signal that HTML drifted. This is the primary oracle and the strongest available evidence.
2. **The existing handler specs**, using the established mock-Hono-context plus app-factory pattern. These now assert on the returned HTML string instead of on render arguments. Prior art: the existing edit-handler, join-handler, create-get/create-post, app-handler and vote-view specs.
3. **The render method itself** — the only new-ish seam: a typed node in, a string out, view context injected, user-supplied text escaped.

Component-level specs are written only where a view is too branch-heavy to reach comfortably from a handler — in practice the proposed-dates section (confirmed versus open status, opponent-votable toggle state, presence of out-of-band companions) and the vote tally (heading-level variants, empty-list collapse, tally values).

**Coverage (agreed).** `.tsx` files are inside the coverage scope and the ≥80%-all-metrics gate applies to them. Coverage is checked in the report before the work is called done; if view branches drag it down, the answer is a focused component spec at the seams above, not an exclusion.

**Tests deleted.** The two loader specs — in-memory map behaviour and disk-mode parity, including the one that mocks the filesystem module to prove it is never touched. Their subject ceases to exist.

**Tests added.** A render-seam spec (string output, view-context injection, escaping of a player name containing markup, and an assertion documenting that a promise must never reach the page). Component specs for the two branch-heavy views named above.

**Tests updated.** The handler specs listed under seam 2, re-pointed at HTML assertions; the config spec, minus the template-source assertions; the app-builder spec, whose error handler now renders components. Spec files are renamed to `.tsx` only where they actually construct JSX.

**Scenarios that must be covered end to end.** Fresh full-document loads of start, create, edit and join (correct document language and language selector present). HTMX partial responses carrying their out-of-band companions and no document preamble. Partial-versus-initial parity on the edit page loaded cold. The four-step scrape wizard chain. Vote registration and per-team tally counts. All four locales via the language query parameter, including date-input placeholders following the locale input format. Accessibility checks green on every page.

**Edge cases.** Create validation failure showing error text with invalid and described-by wiring on the offending field. Both error branches — full page and out-of-band container. Unknown session id yielding a not-found, and the Worker's asset fall-through. Empty collections collapsing rather than rendering empty shells. Confirmed status hiding the add-date form and offering reopen, with the reopen chip once the count is non-zero. Escaping of user-supplied names.

**Gate.** `npm run verify` (lint → test → build → e2e) plus the Workers dry-run build, confirming the bundle carries no view-layer filesystem reference.

## Out of Scope

- A build-time static JSX generator (rejected above).
- JSX context providers or request-context hooks for translations, locale and input format — these stay explicit props.
- JSX streaming; responses remain buffered strings.
- Any change to HTML structure, CSS classes, HTMX attributes, routes, validation, the session store or the security model.
- Client-side JSX, hydration, or anything that moves this app toward an SPA.
- Model or schema changes; the view-model builders are reused as-is.
- Redesigning the handler or router structure. Views stay colocated with handlers.
- Performance work. Any speedup from dropping the loader is incidental, not a goal.

## Further Notes

- Whitespace-only differences in the output are acceptable; anything that changes an element, attribute, id or role is not.
- Some vendored CSS and the date-picker markup are whitespace-sensitive in places, so markup is converted verbatim rather than reformatted.
- The engine's boolean-attribute handling is verified present in the installed version, as is `hx-*` attribute typing (the HTML attribute types admit arbitrary attributes, so no declaration merging is needed). The strict index-signature access rule does not interfere: JSX attributes are not property access.
- Net effect: one dependency, one build step, one generated artifact, one config key with two wiring sites, one lint suppression, one unsafe cast and two spec files removed — around two dozen files gone — in exchange for a type-checked render boundary and nothing the end user can see.
