# Bare /edit is a reachable 404

Status: resolved

## Summary

The home page linked to `/edit`, but no handler serves `GET /edit` — it fell through to 404.

## Evidence

- `src/routes/index.tsx:19` rendered a link with `href="/edit"`.
- `src/build-app.tsx:37` mounts `editRouter` at `/edit`; `src/routes/edit/router.ts` declares only `/:id`-prefixed routes.
- `e2e-tests/start-page.e2e.ts:26` only asserted `toHaveAttribute('href', '/edit')` and never navigated, so the 404 was untested.

## Resolution

The "Edit an existing Postponement" workflow was removed entirely — there is no password-reconnect flow. The home page no longer links to `/edit`; an edit page is reached only via the edit link of a created postponement. The `edit_existing` translation keys and the `StartPage.editLink` page-object were removed with it, and the arc42 debt row was struck.
