# 04 — Join and vote form validation

**What to build:** The join form (`src/routes/join/join.eta`) and vote form (`src/routes/join/vote.eta`) lack inline validation, error reporting, `aria-required`, and `aria-invalid` attributes. Validation failures result in a generic 400 error page rather than inline feedback.

**Status:** ready-for-agent

**Blocked by:** None — can start immediately.

## Current state

- `join.eta`: no `required` attributes, no `aria-required`, no error-reporting elements. Server-side validation errors redirect to the generic error page.
- `vote.eta`: radio button groups have no `required` attribute. Submitting without a selection silently records nothing.

## What to build

- Add `required` and `aria-required="true"` to all mandatory form fields
- Add inline error reporting: error container with `role="alert"`, `aria-invalid` and `aria-describedby` on inputs
- Return partial error responses (not full-page error renders) when validation fails on POST
- Ensure server-side validation errors map back to inline fields, not the global error page
- e2e test: submit empty form, verify error is announced and focusable

## Acceptance criteria

- [ ] Join form shows inline validation errors with `role="alert"` and `aria-invalid` / `aria-describedby`
- [ ] Vote form requires at least one selection (or explicitly allows none — document the decision)
- [ ] `checkA11y()` passes after error states
- [ ] e2e test verifies error announcement and keyboard navigation to error
