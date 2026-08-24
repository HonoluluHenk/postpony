# ADR 0019: JSX Templates (Hono JSX)

## Status

Accepted

## Context

[ADR 0008](0008-templating-engine-selection.md) selected **Eta** as the templating engine. That decision assumed a runtime with access to a filesystem for loading `.eta` template files. Two platform realities changed that assumption:

1. **Cloudflare Workers** has no `node:fs` at runtime, so templates must be compiled into the bundle or loaded in-memory at startup. Ticket 04 of the Cloudflare migration already solved this by pre-compiling Eta templates into a module map, but that approach adds a codegen step and decouples the template syntax from TypeScript's type checker.
2. **Type safety at the render boundary** — Eta templates are type-checked by the Eta compiler, but props flow as an untyped `Record<string, unknown>` at the call site. A misspelled prop key is a runtime blank, not a compile error.

Hono ships a built-in JSX renderer (`hono/jsx`) that produces HTML strings with zero dependencies. Since the app already uses Hono, this renderer is available at no extra cost. JSX components are plain TypeScript functions: typed props, typed children, IDE autocomplete, and no codegen or template-source configuration.

This ADR records the rendering approach that was actually implemented and makes it the approved target.

## Decision

PostPony uses **Hono JSX** (`hono/jsx`) for all server-side HTML rendering. Templates are `.tsx` components colocated with their route handlers under `src/routes/`, with shared layouts in `src/routes/layouts/`.

- **Props are typed** at the render boundary via `interface` declarations (e.g. `LayoutProps`, `EditPageProps`).
- **`app.render(component)`** in `App` takes a `JSX.Element` and serializes it to HTML via `.toString()`.
- **No template engine dependency**: Eta is removed from the project. No `.eta` files, no in-memory compiler, no template-source config knob.
- **Partial vs full-page rendering** is handled by the `pageLayout(view, content, title?)` helper in `src/routes/layouts/main.tsx`, which branches on `view.isPartial` to return either a `PartialLayout` (HTMX fragment with OOB error container) or the full `Layout` (complete HTML document).

This **supersedes ADR-0008** for PostPony's rendering strategy.

## Rationale

- **Zero new dependencies**: `hono/jsx` is already part of the installed Hono package. No template engine to install, configure, or maintain.
- **Typed props at the render boundary**: TypeScript catches misspelled prop names and missing required fields at compile time. IDE autocomplete works inside and across components.
- **No codegen or build-time step**: JSX compiles via Vite's existing `.tsx` pipeline. No separate template compilation, no template-source config knob, no in-memory compiler map.
- **Per-request rendering preserved**: The app renders per-request, per-postponement, per-locale HTML. JSX components receive `ViewContext` (t, locale, isPartial, baseUrl, inputFormat, languageOptions) as props — the same shape that Eta received as template locals.
- **Colocation**: Handlers and their JSX components live in the same `.tsx` file (e.g. `create-get.tsx`, `edit-id-get.tsx`), with shared partials (`team-section.tsx`, `proposed-dates-section.tsx`) alongside.

## Alternatives Considered

- **Keep Eta with in-memory compilation** (the ticket-04 approach) — rejected: adds a codegen/template-compilation step, props are untyped at the call site, and the Eta runtime is an extra dependency that provides no benefit over the already-installed Hono JSX renderer.
- **Build-time static JSX generator** — rejected: writes HTML at build time and has no per-request rendering API, while this app renders per-request, per-postponement, per-locale HTML.
- **htmx + JSON API + client-side rendering** — rejected: contradicts the SSR-first, hypermedia-driven architecture (ADR-0003, ADR-0009).

## Consequences

- **Developers write TypeScript functions**, not `.eta` templates. The learning curve is JSX syntax (expressions in `{}`, `className` instead of `class`) for anyone coming from plain HTML.
- **`className` required**: JSX uses `className` instead of HTML `class`. This is a mechanical find-and-replace from the old templates.
- **No template engine dependency**: Eta is fully removed from `package.json` and the build.
- **Supersedes ADR-0008** for PostPony's rendering target.
