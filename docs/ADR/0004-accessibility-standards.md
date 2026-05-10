# ADR 0004: Accessibility Standards

## Status
Accepted

## Context
The application must be inclusive and usable by all potential participants, including those with visual, auditory,
motor, or cognitive disabilities. Sports clubs often have a diverse member base with varying accessibility needs.

## Decision
We will adhere to the **Web Content Accessibility Guidelines (WCAG) 2.2 Level AA** as our primary standard for
accessibility.

Key areas of focus:
1.  **Perceivable**: Text alternatives for non-text content, adaptable content structure, and sufficient color
    contrast.
2.  **Operable**: Full keyboard accessibility, sufficient time for interactions, and avoidance of content that
    could cause seizures.
3.  **Understandable**: Readable and predictable interface, and helpful input assistance (error prevention and
    correction).
4.  **Robust**: Compatibility with assistive technologies (like screen readers) through correct use of semantic
    HTML and ARIA.

## Rationale
*   **Legal Compliance**: Many regions require digital accessibility compliance (e.g., ADA, EAA).
*   **Inclusivity**: Ensuring all team members and opponents can participate in the rescheduling process regardless
    of ability.
*   **Best Practice**: Adhering to WCAG 2.2 AA (the latest stable version at the time of decision) ensures a high
    quality of user experience for everyone.

## Consequences
*   Accessibility must be considered at every stage: design, development, and testing.
*   The choice of UI components and libraries must prioritize accessibility.
*   Automated (e.g., axe-core) and manual (e.g., screen reader) testing will be part of the development workflow.
*   Designers must provide specifications for color contrast, focus states, and skip links.
