# ADR 0008: Templating Engine Selection

## Status
Proposed

## Context
The project uses a server-side rendered (SSR) architecture with **TypeScript** and **HTMX**. To generate HTML on the server, we need a templating engine that is easy to use, widespread, and plays well with TypeScript and HTMX's "hypermedia-driven" approach.

## Decision
We will use **Eta** as the primary templating engine.

## Rationale
*   **Performance**: Eta is significantly faster than EJS and most other JavaScript templating engines.
*   **Syntax**: It uses a syntax very similar to EJS (`<% ... %>`), which is widely known and easy to learn.
*   **TypeScript Support**: Eta has excellent built-in support for TypeScript, allowing for type-checked templates and better developer experience compared to EJS or Pug.
*   **Lightweight**: It has zero dependencies and a small footprint, making it ideal for the "simple and low-cost" goal.
*   **HTMX Integration**: Eta's ability to easily define partials and layouts makes it a perfect fit for HTMX's requirement of returning HTML fragments.
*   **Flexibility**: Unlike Pug, Eta uses plain HTML-like syntax, which aligns with our decision to stay close to standard web technologies and modern CSS.

## Alternatives Considered
*   **EJS**:
    *   *Pros*: Most widespread, simple syntax.
    *   *Cons*: Slower performance, lacks some modern features like better layout support without extra plugins, and TypeScript integration is less seamless than Eta.
*   **Pug**:
    *   *Pros*: Concise syntax, very popular.
    *   *Cons*: Significant learning curve for those used to HTML, makes it harder to copy-paste standard HTML/CSS snippets, and deviates from the "Plain HTML" goal.
*   **Handlebars**:
    *   *Pros*: Logic-less templates encourage separation of concerns.
    *   *Cons*: Can be restrictive when complex logic is needed for scheduling suggestions, and requires more boilerplate for custom helpers.

## Consequences
*   Developers need to be familiar with EJS-style syntax.
*   We will leverage Eta's `include` and `layout` features to manage UI components and fragments for HTMX.
*   Templates will be stored as `.eta` files.
