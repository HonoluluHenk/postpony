# 12. Glossary

The ubiquitous language is maintained in [`CONTEXT.md`](../../CONTEXT.md) — the canonical glossary of domain terms (Postponement, Match, Organizer, Player, Participant, Proposed Date, Clash, Venue, Venue Occupancy, Vote, Status, Invitation Password, click-tt Team Identity, Fixture Mode, Planning Window, iCal Export, Club, Locale, and their _Avoid_ anti-terms).

Terms specific to the architecture (not domain vocabulary):

- **Partial / initial render** — an HTMX fragment swap vs a full-page render; a partial must never render an element absent from the initial template.
- **Seam** — an overridable point of non-determinism (`newId`/`now`, `SessionStore`, scraper fixture loading) that tests substitute.
- **Fixture mode** — the scraper reads local HTML instead of the network when `click-tt-fixtures-dir` is set; e2e always runs in this mode.
- **Worker/Node parity** — one codebase runs on Cloudflare Workers (prod) and Node (dev); Node-only imports are loaded dynamically to stay out of the Worker bundle.
- **OOB (out-of-band) swap** — an `hx-swap-oob` element updated outside the primary swap target (e.g. `#error-container`, `#status-chip`).
