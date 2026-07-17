# ADR 0011: Token Security and Structure

## Status
Proposed

## Context
The application uses tokenized links for two primary purposes:
1.  **Onboarding**: Inviting Team Captains to a club.
2.  **Rescheduling**: Inviting participants (Players and Opponent Captains) to a specific rescheduling session.

These tokens must be secure enough to prevent unauthorized access while remaining easy to distribute via messaging apps (WhatsApp, Email).

## Decision
We will use **Opaque Tokens** (randomly generated strings) stored in Firestore for both onboarding and rescheduling invitations.

### 1. Onboarding Tokens (Club Manager → Team Captain)
*   **Structure**: A high-entropy random string (e.g., `nanoid` or `crypto.randomUUID()`).
*   **Storage**: Stored in a `OnboardingToken` collection in Firestore.
*   **Properties**:
    *   `club_id`: The club the captain is being invited to.
    *   `role`: The intended role/permissions (e.g., "Team Captain").
    *   `expiresAt`: Short-lived (e.g., 48 hours).
    *   `used`: Boolean flag (Single-use).
*   **URL Format**: `https://app.url/onboard?token=RANDOM_TOKEN`

### 2. Reschedule Invitation Tokens (Captain → Participants)
*   **Structure**: The `invitationPassword` (from [ADR 0002](0002-security-model-dual-password.md)) will serve as the token.
*   **Storage**: Stored as `invitationPasswordHash` within the `RescheduleSession` document.
*   **Properties**:
    *   **Scope**: Bound to a specific `RescheduleSession`.
    *   **Longevity**: Valid as long as the session is not "Confirmed" or "Closed".
    *   **Multi-use**: Accessible by any participant with the link.
*   **URL Format**: `https://app.url/reschedule/[session_id]?token=[invitation_password]`

## Rationale
*   **Security**: Opaque tokens stored server-side allow for easy revocation and status tracking (e.g., `used` flag) compared to stateless JWTs.
*   **Simplicity**: Using the `invitationPassword` as the token for rescheduling sessions avoids creating an additional "token" entity for every session.
*   **User Experience**: Embedding the secret in the URL fulfills the "link-only" requirement for participants, eliminating manual password entry.
*   **Auditability**: Firestore storage allows the system to track when and by whom (if applicable) a token was used.

## Consequences
*   **Database Lookups**: Every request using a tokenized link requires a database lookup to verify the token/password. Firestore's performance and indexing make this negligible.
*   **Revocation**: If a link is leaked, the Club Manager or Team Captain can revoke the token or change the invitation password to invalidate the link.
*   **No PII**: Tokens should not contain or encode any Personally Identifiable Information (PII).
