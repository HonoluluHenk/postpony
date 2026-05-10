# ADR 0007: Data Storage Strategy

## Status
Proposed

## Context
The application needs to store and query highly structured and relational data, such as:
*   **Venues** and their complex operating hours/bookings.
*   **Teams** and their multi-tenant relationship to clubs.
*   **Reschedule Sessions** with associated proposed dates and votes.
*   **Availability** intersections between multiple entities (Venue, Home Team, Opponent, Players).

The system also requires strict data integrity for voting and final date selection (ACID compliance).

## Decision
We will use **PostgreSQL** as the primary data store.

For any semi-structured data (e.g., custom availability rules or varying notification metadata), we will utilize PostgreSQL's **JSONB** capabilities to maintain flexibility without sacrificing relational integrity.

## Rationale
*   **Relational Integrity**: The core logic of the application (Suggestion Engine) relies on joining and intersecting data from different entities. SQL is natively designed for these operations.
*   **ACID Compliance**: Ensuring that a vote is counted correctly and that a finalized date is consistent across all participants is critical.
*   **Complex Constraints**: SQL allows for robust data validation at the schema level (e.g., ensuring a booking doesn't overlap with another at the DB level).
*   **Hybrid Approach**: PostgreSQL's support for JSONB provides a "best of both worlds" scenario, allowing us to store flexible data structures while keeping the core relational model.
*   **Ecosystem & Tooling**: PostgreSQL has mature support for the chosen stack (Next.js, Prisma/Drizzle) and hosting providers (Neon/Supabase).
*   **Multi-tenancy**: Implementing row-level security or column-based filtering for multi-tenancy is straightforward and performant in SQL.

## Alternatives Considered
*   **NoSQL (e.g., MongoDB)**:
    *   *Pros*: Flexible schema, easy horizontal scaling.
    *   *Cons*: Joins and complex relational intersections are more difficult to implement and maintain. Data consistency is harder to guarantee for transactional workflows like voting.
*   **Key-Value Stores (e.g., Redis)**:
    *   *Pros*: Extremely fast.
    *   *Cons*: Not suitable as a primary store for complex relational data; could be used later for caching.

## Consequences
*   Developers must define a clear schema upfront.
*   Migrations will be required as the application evolves (managed by Prisma/Drizzle).
*   The "Suggestion Engine" logic can leverage powerful SQL queries for performance.
