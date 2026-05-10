# Implementation Requirements & Technical Plan

To proceed from specification to a working software implementation, the following technical components and decisions are
required.

## 1. Technical Stack (Proposed)
See [ADR 0003: Core Tech Stack](ADR/0003-core-tech-stack.md) for details.

## 2. Data Models
We need to define the schema to support multiple clubs (multi-tenancy):
*   **Clubs**: The top-level tenant entity.
    *   `club_id` (Primary Key).
    *   `name`, `settings`.
    *   **Club Admin Password**: Hashed password for the Club Manager.
*   **Teams**: Linked to a Club (`club_id`). Managed by Club Managers and Team Captains.
*   **Users/Players**: Profiles for Club Managers (permanent accounts) or names linked to teams for players.
    *   **Players**: No permanent accounts. Access via invitation link. Data includes `name` and `availability`.
    *   `club_id` (Mandatory for isolation).
    *   Roles: Club Manager, Team Captain, Player.
*   **Venues**: Linked to a Club (`club_id`).
    *   Name, Location.
    *   **Availability**: (JSONB) Stores general operating hours using date/time ranges.
    *   **Bookings**: (JSONB or separate table) Stores specific blackout date/time ranges.
    *   **Max Overlaps**: Integer (optional, defaults to null/unlimited).
*   **Reschedule Sessions**:
    *   Unique ID (Slug/UUID).
    *   Owner Password (hashed).
    *   Invitation Password (hashed).
    *   Current status (Draft, Proposed, Voting, Confirmed by Opponent, Confirmed).
    *   **Max Overlaps**: Integer (optional, overrides venue default).
    *   Session Metadata: (JSONB) For flexible session-specific settings.
*   **Proposed Dates & Times**: Specific dates and times selected by the owner or opponent captain for voting.
*   **Votes**: Records of participant votes (User/Participant ID, Proposed Date/Time ID, Vote Type).
*   **Availability Records**: Time ranges provided by players or captains. Can use JSONB for complex recurring patterns.

## 3. Core Algorithms
*   **Suggestion Engine**: A logic component that performs "intersection" operations on date and time ranges:
    *   `Venue Open Hours` MINUS `Existing Bookings` (considering `Max Overlaps`).
    *   INTERSECT `Opponent Team Availability` (Automatically fetched if opponent exists in the system).
    *   INTERSECT `Our Team Player Availability` (considering a minimum player threshold).
    *   MINUS `Holidays`.

## 4. Integration & Infrastructure
*   **Email/WhatsApp Gateway**: While the system generates text, we need to decide if the *app* sends it (requiring
    Twilio, SendGrid, etc.) or if the *user* copies it to their own client.
*   **Holiday API**: Integration with a public holiday API (e.g., Abstract API or Nager.Date) to automate holiday
    detection based on region.
*   **Hosting**: Priority on zero-cost infrastructure in Switzerland/EU (e.g., Oracle Cloud Always Free with Coolify).
    See [ADR 0006: Cloud Hosting & Deployment](ADR/0006-cloud-hosting.md).
*   **CI/CD Pipeline**: Automated deployments via GitHub/GitLab integration.

## 5. Security & Privacy
*   **Data Protection**: Ensure GDPR/CCPA compliance, especially since player availability can be sensitive.
*   **Authentication**: Defining the "Password-only" access flow vs. traditional "Email/Login" accounts.
    *   Club Manager: Secure login (password).
    *   Reschedule Sessions: Dual-password model (Owner vs. Invitation).
    (See [ADR 0002: Security Model - Dual-Password System](ADR/0002-security-model-dual-password.md))

## 6. Design & UX
*   **Wireframes/Mockups**: To ensure **WCAG 2.2 AA** requirements are met from the start (e.g., color contrast, focus
    indicators, keyboard navigation).
*   **Accessibility Testing**: Plan for automated and manual accessibility audits (e.g., using Axe, Lighthouse, and
    screen readers).
*   **E2E Testing**: Use **Playwright** for cross-browser functional testing and automated accessibility checks
    (see [ADR 0005](ADR/0005-e2e-testing-playwright.md)).
*   **Localization Strategy**: Determining which languages to support initially.

---

### Immediate Next Steps
1.  **Select the Tech Stack**: (See [ADR 0003](ADR/0003-core-tech-stack.md))
2.  **Define MVP Scope**: Which of the "suggestions" features are most critical for the first version?
3.  **Confirm Infrastructure**: Oracle Cloud "Always Free" (Zurich or Frankfurt) with Coolify.
