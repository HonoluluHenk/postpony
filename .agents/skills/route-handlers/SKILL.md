---
name: route-handlers
description: How route handlers, routers, and the App wrapper work in this project (PostPony). Use when adding or changing a Hono route, an .eta view, or a request handler, or when you need the App API (requireParam, failure/notFound, isPartial, render, t) or the invited-participant guard pattern.
---

# PostPony Route Handlers

This skill documents the project-specific conventions layered on top of Hono. For generic Hono API questions use the `hono` skill; for HTMX behaviour use the
`htmx` skill.

## When to Use This Skill

Use this skill whenever you need to:

- Add or modify a route handler (`*-get.ts` / `*-post.ts`) or its `.eta` view.
- Create or mount a router.
- Read/validate request params, queries, or bodies.
- Signal an error to the UI, or branch on full-page vs HTMX fragment rendering.
- Add an invited-participant route that reuses the join guards.

## The `App` wrapper

Handlers never take a raw Hono `Context`. They take an `App`
(`src/app.ts`) that wraps the context. Signature:

```ts
export function handleThingGet(app: App): Response | Promise<Response> { ...
}
```

Key members:

- `app.c` — the underlying Hono `Context` (use `app.c.req.query(...)`,
  `app.c.html(...)`, `app.c.redirect(...)`, etc.).
- `app.t(key, params?)` — localized string; `key` is typed as `TranslationKeys`
  (see the `localization` skill).
- `app.isPartial` — `true` when the request carries `HX-Request`. Render a fragment when partial, the full layout otherwise.
- `app.render(template, data)` — renders an `.eta` template from `src/routes/`; automatically injects `t`, `locale`, `isPartial`, and `baseUrl`.
- `app.requireParam(name)` / `app.requireParam(name, transform)` — reads a path param, throwing a localized `missing_param` failure if absent; the second form maps the value (e.g. to a number).
- `app.sessions` — the static in-memory session store (`Record<string, RescheduleSession>`).

### Signalling errors

Do **not** build error responses by hand. Throw via these `App` helpers; the
`onError` handler in `src/index.ts` turns them into the right UI response (an out-of-band `#error-container` for HTMX partials, or the `error.eta` page):

- `app.failure(message, status = 400)` → `AppError`
- `app.notFound(message?)` → `StateError` (404)
- `app.internal(message?)` → `InternalError` (500)

Always pass localized messages, e.g. `app.failure(app.t('join_invalid_team'), 400)`.

## Routers and wiring

Routers are built with the shared factory and mounted in `src/index.ts`:

```ts
// src/routes/join/router.ts
import { factory, handleAppRequest } from '../../lib/hono-factory';

const joinRouter = factory.createApp();
joinRouter.post('/:id/:team/register', handleAppRequest(handleJoinRegisterPost));
joinRouter.get('/:id/:team', handleAppRequest(handleJoinGet));
export default joinRouter;
```

- `handleAppRequest(fn)` adapts an `App`-based handler into a Hono handler by calling `App.create(c)` — always wrap handlers with it.
- Register more specific routes **before** less specific ones (e.g.
  `/:id/:team/vote` before `/:id/:team`).
- Mount the router in `src/index.ts` with `app.route('/join', joinRouter)`.
- File naming: one handler per file, `*-get.ts` / `*-post.ts`, with the `.eta`
  view alongside it.
- **Partial vs initial render**: the edit page's initial template (`edit.eta`)
  must render every UI element that the HTMX partials (`proposed-dates-section.eta`,
  `team-section.eta`, etc.) render. Tests load the page fresh — they never run an HTMX request first. If a toggle or control only exists in the partial, it is invisible on page load.

## Invited-participant guard pattern

Routes for token-gated participants reuse the guards in
`src/routes/join/join-utils.ts` (see [ADR 0013](../../../docs/adr/0013-join-participant-identity.md)):

- `requireTeam(app): 'home' | 'away'` — validates the `:team` path param.
- `requireSessionAndToken(app): {id, session, token}` — resolves the session and verifies `?token=` against `invitationPasswordHash`.

Reuse these for any future invited-participant route instead of re-implementing token/team checks.
