# 06 — Reconcile ADR-0006 / record Cloudflare Workers deployment

**What to build:** The architecture decision record is updated so the chosen deployment strategy is documented. ADR-0006 currently lists a Dockerized Coolify VPS as the primary zero-cost strategy; this ticket extends (or supersedes with a dedicated ADR) it to record Cloudflare Workers + Turso + Workers Assets as an approved, zero-cost deployment strategy for PostPony. No code changes — only the decision record, keeping the ADR set consistent with what was actually built in tickets 01–05.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] ADR-0006 is extended (or a new ADR added) covering Cloudflare Workers + Turso + Workers Assets. (New ADR 0018 added.)
- [x] The decision notes it supersedes the Dockerized-VPS primary for this deployment.
- [x] Data residency / GDPR note is updated to reflect the chosen region-agnostic, free-tier approach.
