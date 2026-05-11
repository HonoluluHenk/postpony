# ADR 0012: Validation Library Selection (Valibot)

## Status

Accepted

## Context

The application requires robust input validation for both client-side and server-side data (e.g., session creation, venue settings, player management). We need a library that is:

- **Small and Lightweight**: To keep the bundle size small and minimize server-side overhead.
- **Developer-Friendly**: Providing a clear, type-safe API that integrates well with TypeScript.
- **Tree-shakeable**: To ensure only used validation functions are included in the build.
- **Extensible**: Allowing for custom validation rules if needed.

## Decision

We will use **Valibot** as the primary validation library.

## Rationale

- **Size**: Valibot is significantly smaller than alternatives like Zod or Yup because it is designed to be fully tree-shakeable.
- **API**: It offers a functional API that is intuitive and type-safe, making it easy to define schemas and extract TypeScript types from them.
- **Performance**: Due to its small size and modular design, it has minimal impact on runtime performance.
- **Compatibility**: It works seamlessly in both Node.js (SSR) and potential future client-side code.

## Consequences

- All manual validation logic in route handlers will be replaced with Valibot schemas.
- Validation errors will be caught and transformed into our standardized `ValidationError` type.
- TypeScript interfaces for models may be derived directly from Valibot schemas where appropriate to ensure a single source of truth.
