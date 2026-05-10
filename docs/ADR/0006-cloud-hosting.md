# ADR 0006: Cloud Hosting & Deployment

## Status
Proposed

## Context
The application needs to be hostable initially on the free tier of a cloud provider. For data residency and
GDPR considerations, the hosting should be located in Switzerland or the European Union (EU).

## Decision
We will prioritize **Zero-Cost / Open-Source** hosting strategies within the EU/Switzerland:
1.  **Primary Strategy (Zero Cost)**: **Oracle Cloud "Always Free" Tier**.
    *   **Region**: `eu-zurich-1` (Switzerland) or `eu-frankfurt-1` (Germany).
    *   **Resources**: Up to 4 ARM Ampere A1 Compute instances with 24 GB of RAM (shared). This is more than sufficient for the MVP and multiple tenants.
2.  **Management Layer**: **Coolify** (Open-source PaaS).
    *   Self-hosted on the Oracle Cloud instance to manage Next.js deployments, PostgreSQL databases, and SSL certificates (via Let's Encrypt) without subscription fees.
3.  **Database**: **PostgreSQL** (Dockerized via Coolify).
    *   Runs on the same "Always Free" instance, eliminating external DBaaS costs (like Neon/Supabase overages).
4.  **Static Frontend (Backup)**: **Vercel** (Hobby Tier).
    *   Can be used for the frontend if specialized features like Image Optimization or global CDN are required, while keeping the API/DB on the free VPS.

## Rationale
*   **True Zero Cost**: Oracle Cloud's "Always Free" tier is one of the most generous in the industry, offering substantial resources for free indefinitely, specifically in Swiss and EU regions.
*   **Sovereignty**: Self-hosting via Coolify on a Swiss-based VPS (Zurich) ensures full data residency and control, minimizing dependence on US-based PaaS providers.
*   **No "Scale-to-Zero"**: Unlike free tiers on Neon or Render, a dedicated free VPS ensures the database is always available, avoiding cold starts.
*   **Scalability**: If the application exceeds the free tier, migrating to a low-cost VPS provider like **Hetzner** (€4-10/mo) or **Infomaniak** is straightforward.

## Consequences
*   **Infrastructure Management**: Moving from PaaS (Vercel/Neon) to self-hosted VPS (Coolify/Oracle) requires more operational knowledge (e.g., setting up the VPS, backups, and security groups).
*   **Availability Risk**: While "Always Free," Oracle Cloud instances are subject to availability. If a region's free capacity is full, deployment might be delayed.
*   **Backups**: Responsibility for database backups shifts to the self-hosted setup (Coolify supports automated S3-compatible backups).
*   **Data Residency**: Using the `eu-zurich-1` region provides strict Swiss data residency, while `eu-frankfurt-1` provides EU residency.
