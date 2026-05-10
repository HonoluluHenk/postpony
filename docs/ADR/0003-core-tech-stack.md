# ADR 0003: Core Tech Stack

## Status
Proposed

## Context
The application needs to be responsive, accessible (**WCAG 2.2 AA** compliant), and handle complex scheduling
logic with relational data.

## Decision
The following technology stack is proposed:
*   **Frontend & API**: **Next.js** (React-based framework).
*   **Language**: **TypeScript** (for type safety and better maintainability).
*   **Database**: **PostgreSQL** (Relational database) - see [ADR 0007](0007-data-storage-strategy.md).
*   **ORM**: **Prisma** or **Drizzle** (to simplify database interactions).
*   **Localization**: **next-i18next** or similar for framework-level i18n support.
*   **E2E Testing**: **Playwright** (see [ADR 0005](0005-e2e-testing-playwright.md)).
*   **Deployment**: **Docker** (to ensure consistency across local dev and self-hosted environments).

## Rationale
*   **Productivity**: Next.js combines frontend and backend (API routes) in a single project.
*   **TypeScript**: Ensures robustness, especially for the complex logic of the "Suggestion Engine".
*   **Accessibility**: React has mature ecosystems for ARIA, keyboard navigation, and accessibility testing tools. Supports **WCAG 2.2 AA**.
*   **Logic**: A relational database is ideal for the "Suggestion Engine".
*   **Cost & Portability**: Using **Docker** allows the entire stack (App + DB) to be self-hosted on a free VPS (e.g., Oracle Cloud Always Free) using management tools like **Coolify**, avoiding proprietary PaaS costs and limitations.

## Consequences
*   **Infrastructure Management**: Moving to a self-hosted Docker environment (Coolify/Oracle) requires more operational knowledge compared to pure PaaS.
*   **Hosting Flexibility**: The system can be deployed to any provider supporting Docker, ensuring maximum cost control and zero vendor lock-in.
