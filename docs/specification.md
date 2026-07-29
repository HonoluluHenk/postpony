# Project Specification: Game Re-scheduler

## 1. Introduction
The Game Re-scheduler is a software solution designed to streamline the process of rescheduling games for sports club teams. It takes into account venue availability, opponent schedules, player availability, and holidays to suggest optimal dates and times for matches.

**Scope**: The system is designed to support multiple sports clubs (multi-tenancy). Each club can have multiple teams. (See [ADR 0001: Multi-Tenancy Strategy](adr/0001-multi-tenancy-strategy.md))

## 2. Core Features

### 2.1. Multi-Club & Team Management

* **Multi-Tenancy Support**: The system supports multiple independent clubs.
* **Club Manager Role**: Each club has one or more Club Managers responsible for high-level administration.
* **Onboarding**: Club Managers can generate an onboarding link (including a secure token - see [ADR 0011](adr/0011-token-security-and-structure.md)) to invite Team Captains to their specific club.
* **Venue & Team Management**: Club Managers can create and manage venue and team entities within their specific club.

### 2.2. Reschedule Management

* **Reschedule Entity**: Each rescheduling process is encapsulated in a top-level "Reschedule"
  entity.
* **Initialization Workflow**: See
  [Use Cases: Rescheduling Initialization](use_cases.md#1-rescheduling-initialization-main-use-case)
  for the detailed process.
* **Security**: (See [ADR 0002: Security Model - Dual-Password System](adr/0002-security-model-dual-password.md))
    * **Owner Password**: A random password generated for the owner (initiator) of the Reschedule.
    * **Invitation Password**: A password for participants (players, opponent captains/players) to access the specific Reschedule instance via an invitation link. For the MVP, the invitation link itself is sufficient for access as it includes the invitation password as a token (see [ADR 0011](adr/0011-token-security-and-structure.md)).

### 2.2. Scheduling Engine
The system suggests possible dates and times based on the following restrictions (Note: Initial MVP focuses primarily on **Venue Availability**):

* **Venue Management**: Each club can manage multiple venues. Venues are strictly owned by a single club. Club Managers (and Team Captains, if authorized) can manually enter and manage venue data.
* **Venue General Availability**: Standard operating hours of the home venue, defined by date and time ranges.
* **Venue Booking**: Specific dates and times when a venue is already occupied.
* **Overlapping Matches**: By default, unlimited overlapping matches are allowed at a venue. Club Managers or Team Captains can optionally specify a maximum number of allowed overlaps for a venue or a specific rescheduling event.
* **Opponent Schedule**: (Future Feature) Known constraints or games already scheduled for the opposing team. If the opponent team's data (e.g., venue availability, existing matches) is already present in the system, it will be automatically integrated.
* **Holidays**: (Out of Scope) Public or school holidays that might affect participation.
* **Team Management**: The owner can add and manage players for their own team.
* **Player Availability**: (Future Feature)
    * Home team players must provide their availability.
    * Captains can enter availability on behalf of players.
    * Opposing team captains and players can provide availability for away games.
    * **Opponent Proposal**: For away games, the opposing team captain can choose to either provide full availability constraints (to use the suggestion engine) or directly propose specific dates and times. If they provide constraints, they have full access to the automated suggestion engine to identify suitable slots.

### 2.3. Voting & Decision Making

* **Date & Time Proposal**: Based on the suggestions, the owner or participants can propose one or more specific dates and times.
* **Voting**: Participants (players, opponent captains) can vote for their preferred date (s) and time (s) from the proposed options.
* **Approval Workflow**:
    1. **Opponent Confirmation**: The invited (opponent) captain must confirm one or more of the proposed dates and times.
    2. **Final Confirmation**: Once the opponent has confirmed, the initiating (home) captain confirms the final date and time.
* **Final Selection**: The session is locked once the final confirmation is complete. (See [Use Cases: Participant Interaction](use_cases.md#4-participant-interaction-voting--proposing) and [Use Cases: Approval & Finalization](use_cases.md#7-approval--finalization))

### 2.4. Communication & Integration

* **Notification Generation**: Generate pre-formatted text suitable for Email or WhatsApp. (See [Use Cases: Invitation & Sharing](use_cases.md#3-invitation--sharing))
* **Invitation Links**: Generated messages will include a link to the application for participants to provide input or view suggestions.

### 2.5. Accessibility & Localization

* **Localization**: Support for **German** and **English** languages and regional formats (dates, times).
* **Accessibility**: The system must adhere to **WCAG 2.2 AA** standards to ensure it is usable by people with various needs. (See [ADR 0004: Accessibility Standards](adr/0004-accessibility-standards.md))

## 3. User Roles

* **Club manager**: Can invite team captains to the club via an onboarding link. Can manage teams and venues for the club.
* **Team Captain (Home)**: Initiates rescheduling, manages team members and availability, sends invitations.
* **Player (Home)**: Provides personal availability via invitation link (no account required).
* **Team Captain (Opponent)**: Reviews suggestions via invitation link. Can provide team/venue availability (if not already in the system) to generate suggestions, and has full access to the automated suggestion engine to propose alternative dates and times based on those constraints.
* **Player (Opponent)**: Provides personal availability (optional, depending on opponent captain's choice) via invitation link.

## 4. Technical Requirements (Draft)

* **Architecture**: Server-side rendered (SSR) backend in **TypeScript** using **Hono** and **HTMX** for dynamic UI updates.
* **Frontend**: Plain HTML with the **Eta** templating engine, **Beer.css** (Material Design 3) for components and layout, and a custom design system via CSS custom properties (`design-tokens.css`).
* **Data Store**: **SQLite via `@libsql/client`** (local file for development, [Turso](https://turso.tech) for production). Sessions stored as JSON blobs in a `sessions` table. See [ADR-0014](adr/0014-sqlite-session-store.md).
* **Localized UI**: Framework-level support for i18n.
* **Security**: Password-protected access to specific rescheduling events. No permanent accounts for players. No password recovery mechanism for session owners in the initial version.

---
