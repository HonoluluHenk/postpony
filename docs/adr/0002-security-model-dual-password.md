# ADR 0002: Security Model - Dual-Password System

## Status
Accepted

> Note (2026): items 2 (Club Management) and 3 (Onboarding) below were never built and are withdrawn; the system is single-club. The organizer password (item 4) is generated and hashed but not currently verified on edit routes (see arc42 §11, risk R1). The invitation password is enforced. The dual-password model (item 4) is amended by ADR-0025, which splits it into four secrets (organizerCaptain, opponentCaptain, home, away).

## Context
The system needs to allow quick, easy access for participants without requiring traditional account creation for
every player. At the same time, the initiator (organizer) of a rescheduling event needs administrative control over
that event.

## Decision
We will implement a layered security model:
1.  **Multi-Tenancy**: All data is partitioned by `club_id` (Logical Separation).
2.  **Club Management**: Club Managers use a traditional password-based login to manage their specific club, venue, and team entities.
3.  **Onboarding**: Club Managers can generate invitation links with unique tokens to onboard Team Captains to their club.
4.  **Reschedule Session**: A **Dual-Password System** for each "Reschedule" session:
    *   **Organizer Password**: A random password generated for the initiator (Team Captain) to manage the session.
    *   **Invitation Password**: A password for all participants to provide availability and vote. In the MVP, this is embedded in the invitation link to streamline access.
5.  **Player Access**: Players do not have permanent accounts. They gain temporary access to specific rescheduling sessions exclusively via the invitation link (which includes the necessary authorization).

## Rationale
*   **Accessibility**: Players don't need to register or remember long-term credentials. They only need the
    invitation link and password.
*   **Security**: Each rescheduling event is isolated by its own set of passwords.
*   **Ease of Use**: Randomly generated passwords for the organizer ensure security without complex setup.

## Consequences
*   The system must securely store these passwords (hashed).
*   If an organizer loses their password, there is no recovery mechanism in the initial version; the session becomes unmanageable and may need to be recreated.
*   The invitation link includes the invitation password as a query parameter or hash to eliminate manual entry for participants.
