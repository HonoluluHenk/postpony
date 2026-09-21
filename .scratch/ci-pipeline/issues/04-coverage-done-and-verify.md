# 04: Coverage done-and-verify

**What to build:** Prove the existing coverage enforcement is already green — this is done-and-verify, not new work. The 90%-per-file coverage thresholds are already in the vitest config; this ticket confirms `npm run test` passes and closes the gap between that fact and any docs still implying coverage is unenforced.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] `npm run test` passes with the existing thresholds (no threshold changes unless something genuinely regressed).
- [x] Any stale in-repo references implying coverage is unenforced or a live future risk are reconciled (arc42 rows fold into ticket 07; this ticket covers non-arc42 references).
- [x] This issue is closed out as verified, not re-implemented.

**Comments:** arc42 §02.2 / §11 coverage-row updates were deliberately moved to ticket 07 so all docs land "as built" together. Proof of enforcement: `vitest.config.ts` thresholds (90 on statements/branches/functions/lines, `perFile: true`) merged in commit `8cde8a5`.