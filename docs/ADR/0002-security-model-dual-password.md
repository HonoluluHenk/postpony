# ADR 0002: Security Model - Dual-Password System

## Status
Accepted

## Context
The system needs to allow quick, easy access for participants without requiring traditional account creation for
every player. At the same time, the initiator (owner) of a rescheduling event needs administrative control over
that event.

## Decision
We will implement a layered security model:
1.  **Multi-Tenancy**: All data is partitioned by `club_id` (Logical Separation).
2.  **Club Management**: Club Managers use a traditional password-based login to manage their specific club, venues, and teams.
3.  **Onboarding**: Club Managers can generate invitation links with unique tokens to onboard Team Captains to their club.
4.  **Reschedule Sessions**: A **Dual-Password System** for each "Reschedule" session:
    *   **Owner Password**: A random password generated for the initiator (Team Captain) to manage the session.
    *   **Invitation Password**: A password for all participants to provide availability and vote.
5.  **Player Access**: Players do not have permanent accounts. They gain temporary access to specific rescheduling sessions exclusively via the invitation link and Invitation Password.

## Rationale
*   **Accessibility**: Players don't need to register or remember long-term credentials. They only need the
    invitation link and password.
*   **Security**: Each rescheduling event is isolated by its own set of passwords.
*   **Ease of Use**: Randomly generated passwords for the owner ensure security without complex setup.

## Consequences
*   The system must securely store these passwords (hashed).
*   If an owner loses their password, there must be a recovery mechanism or the session becomes unmanageable.
*   The invitation link should ideally include the invitation password as a query parameter or hash to streamline
    participant access, while still maintaining the password protection.
