# ADR 0007: Data Storage Strategy

## Status
Superceded by ADR 0014

## Context
The application needs to store and query data for rescheduling events, including venue availability, player status, and voting results.

## Decision (Original)
We will use a **Document Store** that supports real-time streaming, specifically **Google Firestore** (or Firebase Realtime Database).

## Decision (Revised — ADR 0014)
We use **SQLite via `@libsql/client`** (Turso in production, local file in development). The entire `RescheduleSession` is stored as a JSON blob in a `sessions` table, keyed by session ID. This avoids the complexity of Firestore's real-time features (which aren't needed — the app uses HTMX OOB swaps driven by POST responses, not change-data-capture) and matches the actual operational model: sessions are read and written by handlers in request-response cycles, not streamed.

## Rationale
*   **Simplicity**: A single JSON column avoids schema migrations for evolving session data.
*   **Operational match**: The app reads/writes sessions synchronously per request; real-time streaming added complexity without benefit.
*   **Turso**: Provides a managed, edge-deployed SQLite for production with minimal configuration overhead.
*   **No real-time needed**: HTMX handles UI updates via `hx-swap-oob` on POST responses — no Firestore listener required.

## Consequences
*   Querying within a session (e.g., filtering votes) happens in-app after deserialization — acceptable given the small data volume per session.
*   The `SqliteSessionStore` implements the `SessionStore` interface behind the same seam as `MemorySessionStore`.
*   ADR-0007 is superseded by ADR-0014.
