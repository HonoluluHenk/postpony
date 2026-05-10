# Implementation Requirements & Technical Plan

To proceed from specification to a working software implementation, the following technical components and decisions are
required.

## 1. Technical Stack (Proposed)
See [ADR 0003: Core Tech Stack](ADR/0003-core-tech-stack.md) for details.

## 2. Data Models (Document Store)
We need to define the collection structure for Firestore to support multiple clubs:
*   **Club (Collection)**: The top-level tenant entity.
    *   `Document ID`: `club_id`.
    *   `name`, `settings`.
    *   `adminPasswordHash`: Hashed password for the Club Manager.
*   **Team (Sub-collection of Club)**:
    *   `name`, `manager_id`.
*   **Venue (Sub-collection of Club)**:
    *   `name`, `location`.
    *   `availability`: Array/Map of date/time ranges.
    *   `bookings`: Array/Map of specific blackout date/time ranges.
    *   `maxOverlaps`: Number (optional).
*   **RescheduleSession (Collection)**:
    *   `Document ID`: Unique slug/UUID.
    *   `club_id`: Reference for multi-tenant isolation.
    *   `ownerPasswordHash`, `invitationPasswordHash`.
    *   `status`: (Draft, Proposed, Voting, Confirmed by Opponent, Confirmed).
    *   `maxOverlaps`: Number (optional).
    *   `metadata`: Map for flexible settings.
    *   **ProposedDate (Sub-collection of RescheduleSession)**:
        *   `dateTimeRange`, `proposerId`.
    *   **Vote (Sub-collection of ProposedDate)**:
        *   `participantId`, `type`.
*   **AvailabilityRecord (Sub-collection of RescheduleSession)**:
    *   `participantId`, `ranges`.

## 3. Core Algorithms
*   **Suggestion Engine (MVP)**: A TypeScript-based logic component that performs "intersection" operations on date and time ranges fetched from Firestore:
    *   Logic (Initial): `Venue Open Hours` MINUS `Existing Bookings` MINUS `Overlapping Match Limits`.
    *   Future Iterations: INTERSECT `Opponent Availability` INTERSECT `Home Team Availability`.
    *   Implementation: Since Firestore does not support complex joins, the engine will fetch relevant documents and perform the intersection in-memory on the backend.

## 4. Integration & Infrastructure
*   **Communication**: The system generates pre-formatted text (WhatsApp/Email templates) for the user to copy-paste into their own clients. Automated sending (Twilio/SendGrid) is considered out of scope for the MVP.
*   **Holiday API**: (Out of Scope)
*   **Hosting**: Priority on zero-cost infrastructure in Switzerland/EU.
    See [ADR 0006: Cloud Hosting & Deployment](ADR/0006-cloud-hosting.md).
*   **CI/CD Pipeline**: Automated deployments via GitHub/GitLab integration.

## 5. Security & Privacy
*   **Data Protection**: Ensure GDPR/CCPA compliance, especially since player availability can be sensitive.
*   **Authentication**: Defining the "Password-only" access flow vs. traditional "Email/Login" accounts.
    *   Club Manager: Secure login (password).
    *   Reschedule Sessions: Dual-password model (Owner vs. Invitation). Invitation access is tokenized via the link.
    (See [ADR 0002: Security Model - Dual-Password System](ADR/0002-security-model-dual-password.md))

## 6. Design & UX
*   **Wireframes/Mockups**: To ensure **WCAG 2.2 AA** requirements are met from the start (e.g., color contrast, focus
    indicators, keyboard navigation). We will use modern CSS (Grid, Flexbox, Variables) to implement a responsive and accessible design without heavy frameworks.
*   **Accessibility Testing**: Plan for automated and manual accessibility audits (e.g., using Axe, Lighthouse, and
    screen readers).
*   **E2E Testing**: Use **Playwright** for cross-browser functional testing and automated accessibility checks
    (see [ADR 0005](ADR/0005-e2e-testing-playwright.md)).
*   **Localization Strategy**: Initial support for **German** and **English**.

---

### Immediate Next Steps
1.  **Select the Tech Stack**: (See [ADR 0003](ADR/0003-core-tech-stack.md))
2.  **Define MVP Scope**: Which of the "suggestions" features are most critical for the first version?
3.  **Confirm Infrastructure**: Dockerized deployment via Coolify in Switzerland or EU.
