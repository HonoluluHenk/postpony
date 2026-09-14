# Bare /edit is a reachable 404

Status: ready-for-agent

## Summary

The home page links to `/edit`, but no handler serves `GET /edit` — it falls through to 404.

## Evidence

- `src/routes/index.tsx:19` renders a link with `href="/edit"`.
- `src/build-app.tsx:37` mounts `editRouter` at `/edit`; `src/routes/edit/router.ts` declares only `/:id`-prefixed routes.
- `e2e-tests/start-page.e2e.ts:26` only asserts `toHaveAttribute('href', '/edit')` and never navigates, so the 404 is untested.

## Acceptance criteria

- The home page no longer links to a path that 404s. Either remove the link, or add a `GET /edit` landing/redirect that reaches a valid state.
- Add/adjust an e2e assertion so the outcome is covered.
