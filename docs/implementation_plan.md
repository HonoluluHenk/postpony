# Implementation Requirements & Technical Plan

To proceed from specification to a working software implementation, the following technical components and decisions are required.

## 1. Technical Stack (Proposed)
See [ADR 0003: Core Tech Stack](adr/0003-core-tech-stack.md) for details.

## 2. Data Models (Session Store)

The application uses a `SessionStore` seam (`src/lib/session-store.ts`) with two implementations:
- `MemorySessionStore` — in-memory `Map`, used in tests.
- `SqliteSessionStore` — `@libsql/client` backed, used in development and production (Turso for production).

The core entity, `RescheduleSession`, is serialised as a JSON blob and stored in a single `sessions` table:
- `id TEXT PRIMARY KEY` — session slug/UUID.
- `club_id TEXT NOT NULL` — tenant identifier for multi-tenancy (see [ADR 0001](adr/0001-multi-tenancy-strategy.md)).
- `data TEXT NOT NULL` — the full `RescheduleSession` JSON blob, including players, proposed dates, and votes.

Nested data (players, proposed dates, votes) is embedded in the JSON rather than stored in separate tables or sub-collections — acceptable because each session's data volume is small and always loaded/saved as a unit.

An earlier plan modelled Firestore sub-collections for `ProposedDate` and `Vote`. This was superseded by the simpler SQLite/JSON-blob approach (see [ADR-0014](adr/0014-sqlite-session-store.md)).

## 3. Core Algorithms

* **Suggestion Engine (MVP)**: A TypeScript-based logic component that performs "intersection" operations on date and time ranges fetched from the session store:
    * Logic (Initial): `Venue Open Hours` MINUS `Existing Bookings` MINUS `Overlapping Match Limits`.
    * Future Iterations: INTERSECT `Opponent Availability` INTERSECT `Home Team Availability`.
    * Implementation: The engine works with in-memory `RescheduleSession` objects fetched via `app.store.get()`, so no complex database joins are needed.

## 4. Integration & Infrastructure

* **Communication**: The system generates pre-formatted text (WhatsApp/Email templates) for the user to copy-paste into their own clients. Automated sending (Twilio/SendGrid) is considered out of scope for the MVP.
* **Holiday API**: (Out of Scope)
* **Hosting**: Zero-cost infrastructure via Cloudflare Workers + Turso + Workers Assets. See [ADR 0018: Cloudflare Workers Deployment](adr/0018-cloudflare-workers-deployment.md) (supersedes [ADR 0006: Cloud Hosting & Deployment](adr/0006-cloud-hosting.md)).
* **CI/CD Pipeline**: Automated deployments via **GitHub Actions** (see [ADR 0010](adr/0010-ci-cd-pipeline-selection.md)).

## 5. Security & Privacy

* **Data Protection**: Ensure GDPR/CCPA compliance, especially since player availability can be sensitive.
* **Authentication**: Defining the "Password-only" access flow vs. traditional "Email/Login" accounts.
    * Club Manager: Secure login (password).
    * Reschedule Sessions: Dual-password model (Organizer vs. Invitation). Invitation access is tokenized via the link using the `invitationPassword` as the token.
    * Onboarding: Token-based onboarding for Team Captains (single-use, time-bound). (See [ADR 0002](adr/0002-security-model-dual-password.md) and [ADR 0011](adr/0011-token-security-and-structure.md))

## 6. Design & UX

* **Wireframes/Mockups**: To ensure **WCAG 2.2 AA** requirements are met from the start (e.g., color contrast, focus indicators, keyboard navigation). We use **Beer.css** (Material Design 3) for layout, components, and color system, plus a custom design system via CSS custom properties (`design-tokens.css`) for application-specific tokens. The cascade uses `@layer` to keep vendor and app styles separate.
* **Accessibility Testing**: Plan for automated and manual accessibility audits (e.g., using Axe, Lighthouse, and screen readers).
* **E2E Testing**: Use **Playwright** for cross-browser functional testing and automated accessibility checks (see [ADR 0005](adr/0005-e2e-testing-playwright.md)).
* **Localization Strategy**: Initial support for **German** and **English**.

---

### Immediate Next Steps

1. **Select the Tech Stack**: (See [ADR 0003](adr/0003-core-tech-stack.md))
2. **Define MVP Scope**: Which of the "suggestions" features are most critical for the first version?
3. **Confirm Infrastructure**: Cloudflare Workers + Turso + Workers Assets deployment (see ADR 0018).
