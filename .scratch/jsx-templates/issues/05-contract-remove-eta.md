# 05: Contract — remove Eta and its Workers-compat scaffolding

**What to build:** With no caller left on the old render path, the template engine and everything that existed only to bridge its filesystem assumption are gone. A build is one command, there is no committed generated view artifact to drift against, and deploying to Workers involves no runtime decision about where views come from.

**Blocked by:** 02 (create and scrape views), 03 (edit views and out-of-band partials), 04 (join and vote views).

**Status:** ready-for-agent

- [ ] The old template files and the string-name render method are removed; the JSX render method is the only render seam.
- [ ] The codegen script, the committed generated view artifact, the dual-mode runtime loader and its two spec files are deleted, along with the loader's lint suppression for implied `eval` and its cast through `unknown`.
- [ ] The codegen npm script is removed and the build script becomes a plain bundler invocation; the e2e-build and start-build scripts inherit that with no further change.
- [ ] The template engine is removed from the dependency manifest and from the bundler's externals list; no new dependency replaces it.
- [ ] The template-source config key is removed together with both of its wiring sites (the Workers variable declaration and the worker env application), and the config spec drops its assertions.
- [ ] The codegen script's entry in the lint config's default-project allowance is dropped.
- [ ] The Node build output contains the views like any other bundled module; the previously documented "no templates in the built output" caveat no longer applies.
- [ ] `npm run verify` passes and the Workers dry-run build succeeds, with the bundle carrying no view-layer filesystem reference.
- [ ] Coverage is at or above 80% on all metrics with view files inside the coverage scope; any shortfall is closed with a focused component spec, not an exclusion.
