# 03: App request/response seam

**What to build:** No handler reads or writes Hono's `Context` directly. `App` exposes the request reads handlers actually perform — query values, parsed body (with the repeated-field option), a header, and the current URL — and the responses they return: HTML, redirect, text and a response header. `App.c` becomes private, with `App.create` the only place that touches `Context`. Every existing handler and spec uses the one seam, and the bespoke per-spec context fakes collapse into a single shared one.

**Blocked by:** 02 (agreed order; the read model's sort recovery reads the current URL)

**Status:** ready-for-agent

- [ ] `App` exposes `query`, `body(options)`, `header`, `currentUrl`, `html`, `redirect`, `text` and `setHeader`
- [ ] `App.c` is private; no handler module references it
- [ ] The HTMX redirect and the HX-Current-URL sort recovery still work
- [ ] One shared test context fake replaces the bespoke fakes in the edit, join, create and ical specs
- [ ] All existing unit, browser and e2e tests are green
- [ ] `npm run verify` passes

## Comments
