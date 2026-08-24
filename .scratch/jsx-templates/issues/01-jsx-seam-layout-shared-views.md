# 01: Expand — JSX render seam, layout, and shared views

**What to build:** A developer can render a page from a typed JSX component instead of a template name, and the start page and error page already do so. The Eta render path stays in place untouched, so every other route keeps working and `npm run verify` is green at the end of this ticket. This is the expand half of an expand–contract migration.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] The toolchain compiles JSX with the automatic transform pointed at the renderer that ships inside the already-installed server framework; no new dependency is added.
- [x] Lint covers the new view file extension with the same strict and stylistic type-checked rule sets, and the spec-file relaxation applies to the new extension too.
- [x] The test runner discovers specs written in the new extension, and its coverage scope includes view files.
- [x] The app object exposes a render method taking a JSX node and returning a string. Its parameter is narrowed to the non-promise arm of the JSX element type, so an accidentally `async` view is a compile error rather than a promise stringified into the page.
- [x] The app object exposes the ambient view values previously merged into every render payload — translation function, locale, partial flag, base URL, locale input format, language options — as one value that can be spread into page props.
- [x] The document layout exists as a component, with a partial counterpart carrying the out-of-band error container and the same content wrapper, plus one helper that makes the partial-versus-full choice in a single place.
- [x] The shared views are converted: the error container, the vote tally (dynamic heading level expressed as a tag held in a variable, not string splicing), and the vote player results.
- [x] The start page and the error page render from components, and both the start-page handler and the app-level error handler are rewired to the new render call.
- [x] The pre-existing Eta render path and every unconverted route are untouched and still work.
- [x] A render-seam spec asserts: string output, ambient view values injected, and a user-supplied name containing markup rendered escaped.
- [x] A vote-tally component spec asserts heading-level variants, empty-list collapse, and tally values.
- [x] `npm run verify` passes; the e2e suite is unmodified.
