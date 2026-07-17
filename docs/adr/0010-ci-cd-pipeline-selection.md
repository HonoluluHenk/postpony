# ADR 0010: CI/CD Pipeline Selection

## Status
Proposed

## Context
The application is designed as a Dockerized TypeScript SSR application to be deployed via Coolify. To ensure reliable and automated deployments, a CI/CD pipeline is required to build the Docker images and trigger deployments.

## Decision
We will use **GitHub Actions** as the primary CI/CD tool for the Game Re-scheduler.

## Rationale
*   **Integration**: Seamless integration with GitHub, where the source code is hosted.
*   **Widespread Adoption**: GitHub Actions is a standard tool with extensive documentation, community support, and pre-built "Actions" for Docker and Coolify integration.
*   **Free Tier**: GitHub offers a generous free tier for public and private repositories, fitting the "zero-cost" project goal.
*   **Coolify Support**: Coolify provides built-in support for GitHub webhooks and can be easily integrated with GitHub Actions to trigger deployments after a successful build.

## Consequences
*   The project will require a `.github/workflows` directory containing the CI/CD configuration.
*   Secrets (e.g., Docker registry credentials, Coolify webhook URLs) will be managed via GitHub Actions Secrets.
*   Automated tests (e.g., Playwright E2E tests) will be integrated into the GitHub Actions pipeline.
