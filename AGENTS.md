# AI Agents Guidelines

This document provides context and guidelines for AI agents working on the PostPony project.

## Project Overview

PostPony is a web-based application for postponing sports matches as quick and easy as the Pony Express. It
calculates optimal times based on venue availability, team/player availability, and holidays.
It also helps users to vote and eventually decide on the best rescheduling options.

## Core Technical Stack

- **Architecture**: Multi-tenancy support (future-proofed).
- **Security**: Dual-password system (Owner Password & Invitation Password).
- **Standards**: WCAG 2.2 AA for accessibility.
- **Testing**: Playwright for E2E and accessibility testing.

## Core Technologies

- Hono (web framework)
- TypeScript
- Valibot (schema validation)
- Eta (template engine)
- Convict (configuration management)
- Temporal polyfill (@js-temporal/polyfill)
- HTML
- Raw CSS without Frameworks
- Beer.css for Material Design
- HTMX with defaultSwapStyle = 'outerHTML'
- NX Monorepo
- Playwright with Axe plugin
- Vite
- Vitest
- Node.js HTTPS server (@hono/node-server)
- Mise tool manager

For more details, see:

- [Project Specification](docs/specification.md)
- [Implementation Plan](docs/implementation_plan.md)
- [Architecture Decision Records (ADRs)](docs/ADR)

## Key Entities

- **Reschedule**: The primary entity representing a rescheduling process.
- **Venue**: Management of operating hours and bookings.
- **Team/Player**: Management of availability.

## Code Style

### Naming

1. Entity-Names are singular

### Indentation / Line-Breaks

1. Use 2 characters for indentation by default.
2. Use 4 characters for Markdown files (required by nested lists).
3. For chained method calls:
    * insert newlines before each chained method call (before the '.')

### Line Length

1. Use a maximum of 120 characters per line.
2. In Markdown files, prefer soft-breaks at sentence or word boundaries.

## AI Agent Instructions

* Ask questions for clarification, do not guess!
* Use the IntelliJ MCP if possible.

### Accessibility

* All UI changes must adhere to WCAG 2.2 AA. Use automated checks (e.g., Axe) during testing.
* Use semantic HTML and ARIA attributes for accessibility.
* Prefer a11y selectors (e.g. `getByRole`) in playwright tests.

### Security

* Respect the dual-password security model. Do not introduce traditional login systems without reviewing [ADR 0002](docs/ADR/0002-security-model-dual-password.md).

### Consistency

* Follow the patterns established in existing ADRs and documentation.

### Localization

* Use framework-level i18n support for all UI text.

### Testing

* Add or update unit-tests for any new features.
* Add or update Playwright tests for any new features or UI changes.
* Place test files alongside the respective source files.
* Prefer running Tests via IntelliJ MCP.
* Place everything possible inside a top-level `describe`
* Coverage:
    * is calculated by default on every test run in the [/coverage](/coverage) directory.
    * must be _at least_ 80% (branch, statement, line and functions). More is better.

### Quality

* On UI changes: verify changes using available Browser MCPs (first available: Firefox, Chrome, Playwright)

### Tools

* Use mise-en-place to install tools. Update the lockfile for tools required by the app.

### Code-Style
