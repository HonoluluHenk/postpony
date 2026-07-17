# ADR 0009: Backend Framework Selection

## Status
Proposed

## Context
The project requires a TypeScript-based backend framework to provide Server-Side Rendering (SSR) for HTMX and Eta templates. The framework needs to be lightweight, easy to use, and have excellent TypeScript support. Candidates include Express, Fastify, and Hono.

## Decision
We will use **Hono** as the primary backend framework.

## Rationale
*   **Modern & Lightweight**: Hono is a small, fast, and modern web framework designed for Edge and Cloudflare Workers, but it also runs perfectly on Node.js and Bun.
*   **Superior TypeScript Support**: Built with TypeScript from the ground up, Hono provides excellent type safety for routes, parameters, and middleware without extra configuration.
*   **HTMX Friendly**: Hono's minimalist approach and easy response manipulation make it ideal for serving HTML fragments and managing headers required by HTMX (e.g., `HX-Trigger`).
*   **Built-in Middleware**: Includes essential middleware (Logger, CORS, Basic Auth) out of the box, reducing the need for many external dependencies.
*   **Performance**: It is significantly faster than Express and competitive with Fastify, which is beneficial for SSR responsiveness.
*   **Developer Experience**: The API is intuitive and follows modern web standards, making it easy for developers to pick up.

## Alternatives Considered
*   **Express**:
    *   *Pros*: Most popular, huge ecosystem.
    *   *Cons*: Older API, requires extra packages for TypeScript support (`@types/express`), and doesn't natively support modern web standards as well as Hono.
*   **Fastify**:
    *   *Pros*: Extremely fast, great plugin ecosystem.
    *   *Cons*: Slightly higher learning curve due to its unique plugin architecture compared to the more standard middleware approach of Hono.

## Consequences
*   **Standardized Routing**: We will use Hono's standard routing and middleware patterns.
*   **SSR Integration**: We will integrate the Eta templating engine with Hono to serve HTML pages and fragments.
*   **Ecosystem**: While Hono's ecosystem is smaller than Express, it is rapidly growing and sufficient for the project's needs.
