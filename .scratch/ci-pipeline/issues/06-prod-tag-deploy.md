# 06: Production tag deploy

**What to build:** The production promotion path and its guardrail: a `deploy-prod` job that fires only when a `v*` tag is pushed, passes `unit` + `e2e`, and refuses to deploy unless the tag name equals the `package.json` version at the tagged commit. After this ticket, the only way a build reaches `spielverlegung.date` is an explicit, versioned, gate-checked tag push.

**Blocked by:** 01 (Manual GitHub & Cloudflare setup), 02 (Gate-only workflow), 03 (Release script)

**Status:** ready-for-agent

- [ ] A `deploy-prod` job fires on `v*` tag pushes only (never on merge, PR, or dispatch) and requires `unit` + `e2e`.
- [ ] It deploys to the production worker with the production Turso auth token from the GitHub secret; Cloudflare API token and account id come from GitHub secrets.
- [ ] The tag → version guard: the job compares the pushed tag against the `package.json` version at that commit and refuses on mismatch.
- [ ] No migration step: production relies on the same lazy migration the staging rehearsal proved.
- [ ] End-to-end verified both ways: a release-script tag (ticket 03) pushed by the human updates production; a deliberately mismatched tag triggers the guard and fails without deploying.

**Comments:** Needs a real tag to verify, which is why ticket 03 (release script) blocks it. The human setup (ticket 01) must exist for the prod secret and bootstrapped worker.