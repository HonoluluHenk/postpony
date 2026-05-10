# AI Agents Guidelines

This document provides context and guidelines for AI agents working on the Game Re-scheduler project.

## Project Overview
The Game Re-scheduler is a web-based application designed to streamline rescheduling sports matches by calculating
optimal times based on venue availability, team/player availability, and holidays.
It also helps users to vote and eventually decide on the best rescheduling options.

## Core Technical Stack
- **Architecture**: Multi-tenancy support (future-proofed).
- **Security**: Dual-password system (Owner Password & Invitation Password).
- **Standards**: WCAG 2.2 AA for accessibility.
- **Testing**: Playwright for E2E and accessibility testing.

For more details, see:
- [Project Specification](docs/specification.md)
- [Implementation Plan](docs/implementation_plan.md)
- [Architecture Decision Records (ADRs)](docs/ADR/)

## Key Entities
- **Reschedule**: The primary entity representing a rescheduling process.
- **Venues**: Management of operating hours and bookings.
- **Teams/Players**: Management of availability.

## AI Agent Instructions
When working on this codebase, please ensure:
1. **Accessibility**: All UI changes must adhere to WCAG 2.2 AA. Use automated checks (e.g., Axe) during testing.
2. **Security**: Respect the dual-password security model. Do not introduce traditional login systems without
   reviewing [ADR 0002](docs/ADR/0002-security-model-dual-password.md).
3. **Consistency**: Follow the patterns established in existing ADRs and documentation.
4. **Localization**: Use framework-level i18n support for all UI text.
5. **Testing**: Add or update Playwright tests for any new features or UI changes.
