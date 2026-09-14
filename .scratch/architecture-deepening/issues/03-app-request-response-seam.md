# 03: App request/response seam

**What to build:** No handler reads or writes Hono's `Context` directly. `App` exposes the request reads handlers actually perform — query values, parsed body (with the repeated-field option), a header, and the current URL — and the responses they return: HTML, redirect, text and a response header. `App.c` becomes private, with `App.create` the only place that touches `Context`. Every existing handler and spec uses the one seam, and the bespoke per-spec context fakes collapse into a single shared one.

**Blocked by:** 02 (agreed order; the read model's sort recovery reads the current URL)

**Status:** ready-for-agent

- [x] `App` exposes `query`, `body(options)`, `header`, `currentUrl`, `html`, `redirect`, `text` and `setHeader`
- [x] `App.c` is private; no handler module references it
- [x] The HTMX redirect and the HX-Current-URL sort recovery still work
- [x] One shared test context fake replaces the bespoke fakes in the edit, join, create and ical specs
- [x] All existing unit, browser and e2e tests are green
- [x] `npm run verify` passes

## Comments

- `a3076c7` ticket done, `2c0b446` review. Added `App` request reads (`query`, `body({all:true})`, `header`, `currentUrl`) and responses (`html`, `redirect`, `text`, `setHeader`), made `App.c` private and removed every `app.c` handler reference, and collapsed the eight bespoke edit/join/create/ical context fakes into `src/lib/__test-utils__/create-app.ts`. `npm run verify` green (713 unit/browser, 118 e2e). Review: 0 hard violations, 4 judgement calls (worst: `App.html` drops Hono's header-capable `init`).
