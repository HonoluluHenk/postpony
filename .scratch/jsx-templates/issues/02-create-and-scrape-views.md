# 02: Create form and scrape wizard views on JSX

**What to build:** Creating a postponement — the create form in both create and change modes, and the four-step scrape wizard (leagues → groups → teams → matches) — renders entirely from typed components, with behaviourally identical HTML.

**Blocked by:** 01 (Expand — JSX render seam, layout, and shared views).

**Status:** done

- [x] The create view is a component with a declared props interface covering both create and change modes.
- [x] The four scrape wizard step views are components, reusing the existing scraper result types as prop shapes rather than introducing parallel ones.
- [x] The create-get, create-post and the four scrape step handlers pass typed props plus the ambient view values.
- [x] Boolean attributes are expressed as booleans and conditional attributes as value-or-undefined; no attribute is raw-injected into markup.
- [x] Validation failure on create still shows the error text with invalid and described-by wiring on the offending field.
- [x] The create-get and create-post specs assert on the returned HTML, not on the arguments handed to the render call.
- [x] `npm run verify` passes; the e2e suite is unmodified.
