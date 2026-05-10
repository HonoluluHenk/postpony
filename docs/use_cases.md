# Use Cases

This document details the primary user workflows for the Game Re-scheduler.

## 1. Rescheduling Initialization (Main Use Case)

This use case describes how a Team Captain starts the process of rescheduling a game.

### 1.1. Steps

1.  **Open Application**: The Team Captain opens the application.
2.  **Selection**: The user is asked to choose between:
    *   **Create a new ReSchedule**
    *   **Edit an existing ReSchedule**
3.  **Create New ReSchedule**:
    *   The system asks for a **ReSchedule name**.
    *   Once entered, the system:
        *   Creates the `Reschedule` entity.
        *   Generates a random **Owner Password** (see [ADR 0002](ADR/0002-security-model-dual-password.md)).
        *   Presents the password to the user.
        *   Proceeds to the **Editing Step**.
4.  **Edit Existing ReSchedule**:
    *   The system asks for the **ReSchedule Admin (Owner) Password**.
    *   The user enters the password.
    *   If the password is correct, the system proceeds to the **Editing Step**.
    *   If incorrect, the system displays an error and allows the user to retry.

2. Editing the ReSchedule

In this step, the Admin (Team Captain) enters all relevant constraints and information required for the Scheduling
Engine to suggest possible dates and times.

### 2.1. Steps

1.  **Access Editing Interface**: The system presents the editing dashboard for the specific `Reschedule` entity.
2.  **Input Information**: The Admin provides the following data (as defined in
    [Specification: Scheduling Engine](specification.md#22-scheduling-engine)):
    *   **Venue Details**: Home venue general availability and operating hours.
    *   **Venue Bookings**: Specific dates and times when the venue is already occupied.
    *   **Overlapping Matches**: The Admin can optionally set a maximum number of overlapping matches for this session (defaults to venue default or unlimited).
    *   **Opponent Constraints**: Any known scheduling restrictions for the opposing team. The system automatically searches for the opponent team within the platform. If found, their existing venue availability and scheduled matches are imported; otherwise, the Admin can enter them manually.
    *   **Holidays**: Selection of relevant public or school holidays.
    *   **Manage Team**: The Admin can add players to their own team.
    *   **Player Availability (Manual)**: The Captain can manually enter availability for their own team members.
3.  **Save/Proceed**: The system saves the entered information and prepares to generate suggestions or move to the
    invitation phase.
4.  **Generate Suggestions**: (Optional) The user triggers the suggestion engine to see possible dates and
    times based on current inputs.

## 3. Invitation & Sharing

This use case describes how the Admin generates and shares the invitation with participants.

### 3.1. Steps

1.  **Select Sharing Option**: In the dashboard, the Admin selects "Share Invitation".
2.  **Choose Channel**: The system offers templates for:
    *   **WhatsApp** (short, emoji-friendly)
    *   **Email** (more formal, detailed)
3.  **Generate Text**: The system generates a pre-formatted message including:
    *   The name of the ReSchedule session.
    *   A brief explanation of the request (e.g., "Please provide your availability for our game").
    *   A direct **Invitation Link**.
    *   The **Invitation Password** (if not embedded in the link).
4.  **Copy/Share**:
    *   **Copy to Clipboard**: The user copies the text to manually paste it into their app of choice.
    *   **Direct Share**: (If supported by the platform) Open the mail client or WhatsApp Web with the pre-filled text.
5.  **Completion**: The Admin confirms the invitation has been sent, and the session state moves to "Input" or
    "Proposed".

## 4. Participant Interaction (Voting & Proposing)

This use case describes how participants (home team players, opponent captain, and opponent players) interact with the
ReSchedule session after receiving an invitation.

### 4.1. Steps

1.  **Access Invitation Link**: The participant clicks the link provided in the invitation.
2.  **Authentication**:
    *   The system asks for the **Invitation Password**.
    *   The user enters the password.
    *   If correct, the system grants access to the participant dashboard.
3.  **Provide Availability or Propose Dates**:
    *   **Data Entry Path**: The participant can provide or update their personal/team availability (venue availability, existing matches, etc.) to help the suggestion engine.
    *   **Automated Suggestion Path (Opponent Captain)**: If the Opponent Captain provides constraints, they can trigger the **Suggestion Engine** to view optimal slots. They can then select these slots to create proposals.
    *   **Direct Proposal Path**: The Opponent Captain can directly propose specific dates and times for the rescheduled game, bypassing or supplementing the automated suggestions.
4.  **Vote on Proposed Dates & Times**:
    *   If the Admin has proposed specific dates and times, the participant can view them.
    *   The participant selects their preferred options (e.g., "Yes", "No", "Maybe").
5.  **Propose New Dates & Times**:
    *   If the participant finds the existing proposals unsuitable or has better suggestions, they can propose a
        new date and time.
    *   The system allows the participant to select a slot and add it to the list of proposed dates and times for others
        to see/vote on.
6.  **Submit/Save**: The participant confirms their choices, and the system updates the session state.

## 5. Venue Management

This use case describes how a Club Manager or Team Captain manages the venues for their club.

### 5.1. Steps

1.  **Access Venue Management**: From the main dashboard, the user selects "Manage Venues".
2.  **View Venues**: The system displays a list of existing venues for the club.
3.  **Add/Edit Venue**:
    *   The user can add a new venue or select an existing one to edit.
    *   The user enters the **Venue Name** and location (optional).
4.  **Manage Availability**:
    *   For each venue, the user can define **General Availability** using date and time ranges (e.g., Mon-Fri 18:00-22:00, or specific dates).
    *   The user can enter **Blackout Dates/Times** (Bookings) where the venue is unavailable.
    *   The user can specify the **Maximum Overlapping Matches** allowed at this venue (defaults to unlimited if not specified).
5.  **Save**: The system updates the venue data, which will be used by the Scheduling Engine for all future `Reschedule` sessions involving this venue.

## 6. Multi-Club Management & Onboarding

This use case describes how the system handles multiple clubs and how Club Managers manage their specific club.

### 6.1. Steps (Club Registration)
1. **System Admin/Self-Service**: A new club registers on the platform (if self-service is enabled).
2. **Initial Setup**: The Club Manager provides the **Club Name** and sets their **Club Admin Password**.
3. **Club Created**: The system generates a unique `club_id` and prepares the club dashboard.

### 6.2. Steps (Captain Onboarding)

1.  **Access Club Management**: The Club Manager logs into their club administration dashboard.
2.  **Generate Onboarding Link**: The Club Manager selects "Invite Team Captain".
3.  **Specify Role/Team**: The Club Manager optionally specifies which team the captain will manage.
4.  **Send Link**: The system generates a unique onboarding link (including a temporary token or password) scoped to that `club_id`.
5.  **Captain Acceptance**:
    *   The Team Captain clicks the link.
    *   The Captain sets up their access.
    *   The Captain is now associated with the club and their assigned team.

### 6.3. Steps (Team Management)

1.  **Manage Teams**: The Club Manager selects "Manage Teams" from the club dashboard.
2.  **Add/Edit Team**:
    *   The Club Manager can create new teams within their club.
    *   The Club Manager can assign or reassign Team Captains to teams.
3.  **Save**: The system updates the club's team structure.

## 7. Approval & Finalization

This use case describes the two-step confirmation process to lock a rescheduled game.

### 7.1. Steps

1.  **Opponent Review**: The Opponent Captain accesses the Reschedule session via the invitation link.
2.  **Date Confirmation**: The Opponent Captain reviews the proposed dates (and/or voting results) and selects one or more dates/times that are acceptable to them.
3.  **Opponent Approval**: The Opponent Captain confirms their selection. The session state moves to "Confirmed by Opponent".
4.  **Admin Notification**: The system notifies the Initiating Admin (Team Captain) that the opponent has confirmed.
5.  **Final Selection**: The Initiating Admin reviews the dates confirmed by the opponent.
6.  **Lock Date**: The Initiating Admin selects the final date and time.
7.  **Session Closed**: The system locks the Reschedule session. The status moves to "Confirmed".

---
