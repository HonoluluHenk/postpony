# ADR 0003: Core Tech Stack

## Status
Proposed

## Context
The application needs to be responsive, accessible (**WCAG 2.2 AA** compliant), and handle complex scheduling
logic with relational data patterns.

## Decision
The following technology stack is proposed:
*   **Frontend**: **HTMX** for dynamic UI components and interactions.
*   **Backend**: Server-side rendered (SSR) application using **TypeScript** (e.g., **Hono**, **Express**, or **Fastify**).
*   **Templating**: Plain HTML with a simple templating engine (e.g., **EJS**, **Eta**, or **Pug**).
*   **Styling**: Plain **CSS** (utilizing modern features like CSS Grid, Flexbox, and CSS Variables).
*   **Data Store**: **Google Firestore** (or Firebase Realtime Database) - a document store supporting real-time streaming.
*   **E2E Testing**: **Playwright** (see [ADR 0005](0005-e2e-testing-playwright.md)).
*   **Deployment**: **Docker** for the backend; Firebase Hosting/Functions if using the Firebase ecosystem.

## Rationale
*   **Simplicity & Performance**: HTMX allows for "hypermedia-driven" applications, reducing frontend complexity by keeping logic on the server and sending HTML fragments instead of JSON.
*   **TypeScript**: Maintains type safety on the backend for complex scheduling logic.
*   **Document Store with Streaming**: Firestore/Firebase provides real-time updates (streaming) which is highly beneficial for collaborative features like voting and availability updates.
*   **Accessibility**: Using plain HTML ensures better control over semantic structure, making it easier to achieve **WCAG 2.2 AA** compliance.
*   **Productivity**: Minimizes the "JavaScript fatigue" by avoiding heavy frontend frameworks while retaining modern interactivity.

## Consequences
*   **Infrastructure Management**: Moving to a self-hosted Docker environment (Coolify/Oracle) requires more operational knowledge compared to pure PaaS.
*   **Hosting Flexibility**: The system can be deployed to any provider supporting Docker, ensuring maximum cost control and zero vendor lock-in.
*   **Data Modeling**: Shifting to a document store requires careful modeling to handle scheduling relationships without native joins.
