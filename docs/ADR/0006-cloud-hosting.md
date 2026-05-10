# ADR 0006: Cloud Hosting & Deployment

## Status
Proposed

## Context
The application needs to be hostable initially on the free tier of a cloud provider. For data residency and
GDPR considerations, the hosting should be located in Switzerland or the European Union (EU).

## Decision
We will prioritize **Zero-Cost / Open-Source** hosting strategies within the EU/Switzerland:
1.  **Primary Strategy (Backend)**: **Dockerized Deployment** on any low-cost or free-tier VPS.
    *   **Management**: **Coolify** to manage the Dockerized TypeScript SSR application.
2.  **Primary Strategy (Data Store)**: **Google Firestore**.
    *   **Location**: `europe-west6` (Zurich) or `europe-west3` (Frankfurt).
    *   **Free Tier**: Generous daily limits for read, write, and storage operations.
3.  **Alternative (Serverless)**: **Firebase Hosting & Functions**.
    *   Can be used to host the entire application (SSR backend as Cloud Functions) within the Firebase ecosystem, benefiting from integrated authentication and streaming.

## Rationale
*   **True Zero Cost**: Google Firestore's free tier is generous for starting projects.
*   **Sovereignty**: Using European regions (`europe-west3`, `europe-west6`) ensures data residency.
*   **Flexibility**: Dockerized deployment via Coolify allows moving between providers (e.g., Hetzner, Infomaniak, Exoscale) easily if free tiers are insufficient or if specific regional hosting is required.
*   **No "Scale-to-Zero"**: Unlike some serverless platforms, a managed VPS ensures the application is always responsive, avoiding cold starts.

## Consequences
*   **Infrastructure Management**: Moving from PaaS (Vercel/Neon) to self-hosted VPS (Coolify) requires more operational knowledge (e.g., setting up the VPS, backups, and security groups).
*   **Backups**: Responsibility for database backups shifts to the self-hosted setup (Coolify supports automated S3-compatible backups).
*   **Data Residency**: Using the `eu-zurich-1` region provides strict Swiss data residency, while `eu-frankfurt-1` provides EU residency.
