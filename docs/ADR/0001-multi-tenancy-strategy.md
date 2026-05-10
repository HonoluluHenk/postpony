# ADR 0001: Multi-Tenancy Strategy

## Status
Accepted

## Context
The application must support multiple independent clubs (multi-tenancy) from the start. Each club will have its
own user, team, and venue. Different strategies were considered: logical separation, schema-per-tenant,
database-per-tenant, and multiple deployments.

## Decision
We will use **Logical Separation (Column-based)** with a shared database to implement the multi-club requirement. Each club owns its specific entities (Team, Venue); sharing venues between clubs is not supported in the initial architecture.

## Rationale
*   **Efficiency**: It is the most efficient way to handle multiple clubs within a single application instance.
*   **Low Cost**: Minimal infrastructure overhead, fitting within free tier limits.
*   **Scalability**: By including a `club_id` in all primary data models, we ensure data isolation while
    maintaining a simple codebase.
*   **Implementation Ease**: Next.js and PostgreSQL (with proper indexing on `club_id`) make this approach
    highly performant and easy to maintain.

## Consequences
*   All queries must strictly include a `WHERE club_id = ?` clause (or use a global filter) to prevent
  cross-tenant data leakage.
*   Large growth of a single club might eventually require migrating to a more isolated strategy (e.g.,
    database-per-tenant), but the current approach is sufficient for foreseeable needs.
