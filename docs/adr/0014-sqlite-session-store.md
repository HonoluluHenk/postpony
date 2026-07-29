# ADR 0014: SQLite/Turso Session Store

## Status
Accepted

## Context
The application stores and retrieves `RescheduleSession` objects in request-response cycles. Initially, sessions were held in an in-memory `Map` (`MemorySessionStore`), which does not survive server restarts. A durable, simple storage backend was needed for development and production.

ADR-0007 originally prescribed Google Firestore, but Firestore's real-time streaming features are unused — the app uses HTMX OOB swaps driven by POST responses, not change-data-capture.

## Decision
Use **SQLite via `@libsql/client`** backed by a `SqliteSessionStore` implementing the `SessionStore` interface. In production, [Turso](https://turso.tech) provides a managed, edge-deployed SQLite. In development, a local file-based SQLite is used.

The entire `RescheduleSession` is stored as a JSON blob in a `sessions` table with columns `id TEXT PK`, `club_id TEXT`, `data TEXT`. The `data` column holds the serialised JSON.

## Rationale
- **Simplicity**: Single JSON column avoids schema migrations for evolving session data.
- **Operational match**: Sessions are read/written per request, not streamed.
- **Turso**: Managed edge SQLite with minimal config overhead.
- **No real-time needed**: HTMX handles UI updates via `hx-swap-oob` on POST responses.

## Consequences
- Querying within a session (e.g., filtering votes) happens in-app after deserialisation — acceptable given small data volume per session.
- `SqliteSessionStore` and `MemorySessionStore` implement the same `SessionStore` seam; tests use `MemorySessionStore`, dev/prod use `SqliteSessionStore`.
- Supersedes ADR-0007.
