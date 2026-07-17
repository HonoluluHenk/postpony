# ADR 0007: Data Storage Strategy

## Status
Proposed

## Context
The application needs to store and query data for rescheduling events, including venue availability, player status, and voting results. Real-time updates (streaming) are highly desirable for collaborative features, such as seeing a vote or availability change as it happens.

## Decision
We will use a **Document Store** that supports real-time streaming, specifically **Google Firestore** (or Firebase Realtime Database). The data will be structured using **sub-collections** (e.g., `ProposedDate` and `Vote` as sub-collections of `RescheduleSession`) to ensure strong hierarchical consistency and simplify access control.

## Rationale
*   **Real-time Streaming**: Firestore's native support for real-time listeners allows the UI to update instantly when data changes (e.g., a new vote is cast or availability is updated), providing a superior user experience for collaboration.
*   **Flexible Schema**: Document stores allow for evolving data structures without the overhead of migrations, which is beneficial for storing varying availability patterns and session metadata.
*   **Scalability**: Firestore is a fully managed, serverless database that scales automatically, fitting well with the requirement for low-cost starting points and future growth.
*   **Offline Support**: Firebase SDKs provide robust offline synchronization, ensuring a participant can provide input even with intermittent connectivity.
*   **HTMX Compatibility**: HTMX can easily handle server-sent events (SSE) or simple polling, but more importantly, the backend can trigger UI updates via HTMX's `HX-Trigger` headers or OOB (Out-of-Band) swaps when Firestore listeners detect changes.

## Alternatives Considered
*   **SQL (PostgreSQL)**:
    *   *Pros*: Strong relational integrity, ideal for complex joins in the "Suggestion Engine".
    *   *Cons*: Real-time streaming requires additional layers (e.g., WebSockets, Supabase Realtime, or polling), increasing architectural complexity.
*   **NoSQL (MongoDB)**:
    *   *Pros*: Flexible schema.
    *   *Cons*: While it supports change streams, Firestore's integration with frontend/backend for "streaming" is more seamless for the targeted use case.

## Consequences
*   **Data Modeling**: We must design the document structure to minimize the need for complex joins (which are not natively supported). Some data duplication or denormalization might be necessary.
*   **Suggestion Engine**: The intersection logic will be performed primarily in the TypeScript backend rather than via complex SQL queries.
*   **Security Rules**: If using the Firebase client SDK directly, we must implement robust Firestore Security Rules. If using only the Admin SDK in the backend, standard server-side authorization applies.
