# 03: Release script

**What to build:** The `npm run release` developer command that keeps a release tag and the `package.json` version in lock step, because production deploys only when a `v*` tag is pushed and the workflow refuses mismatched tags. It runs the Verify Gate locally, bumps to the release version, commits, tags, bumps back to the next `-dev` version, commits, and prints the push commands — it never pushes.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] `npm run release` runs the Verify Gate (`npm run verify`) locally and aborts the whole release if it fails.
- [x] From a `-dev` value (e.g. `1.0.0` → release `1.0.0` → next `1.1.0-dev`) it: bumps `package.json` version to the next `X.Y.Z`, commits, creates an annotated `vX.Y.Z` tag at the bump commit, bumps back to `X.Y.0-dev` and commits.
- [x] It does not push: it prints the `git push` and `git push --tags` commands for the human to run (pushing the tag is what triggers CI).
- [x] Fails loudly if the working tree is dirty, the tag already exists, or the current version does not end in `-dev`.
- [x] The script is a standalone script file deliberately kept out of the vitest coverage include (no unit tests); its correctness is exercised by the manual first-release run (ticket 01).

**Comments:** Standalone seam — intentionally not unit-tested (see spec "Testing Decisions"). Prod deploy (ticket 06) needs a real tag from this script to verify end-to-end.

## Comments

- Commits: `d05bbea` (ticket done), `a6ba88f` (arc42 verified-commit bump), `eacb696` (review). No `review-fixed` commit: the code review ran before commit and its two actionable findings (guard-order header comment, `package-lock.json` version drift) were already fixed inside `d05bbea`; the third finding is the accepted test-exemption judgement, so nothing remained to fix after the review commit.
- One-line summary: `npm run release` (`scripts/release.mjs`) — fails loudly on a dirty tree / existing `vX.Y.Z` tag / version that is not `X.Y.Z-dev` (or a plain `X.Y.Z` awaiting its first tag), runs the Verify Gate and aborts on failure, then bumps to `X.Y.Z`, commits, annotated `vX.Y.Z` tag, bumps back to `X.Y.0-dev`, commits — and prints `git push` / `git push --tags` without ever pushing. Verified by 36 assertions across 6 isolated scratch-repos (success from `-dev`, `1.0.0` first-release bootstrap, dirty tree, existing tag, invalid version, verify failure — the real repo state was never mutated); `npm run lint` and `npm run test` green in the worktree; the live release sequence (real commit+tag) is deliberately left to the manual first-release run (ticket 06).
- Deviation from AC-4's literal wording (needs human sign-off): AC-4/spec line 47 say "version does not end in `-dev`" fails loudly, but the spec's own versioning line (line 48, "current `1.0.0` is the first release target") and example "`1.0.0` → tag `v1.0.0` → `1.1.0-dev`" require accepting the current plain `1.0.0`. The script therefore accepts a plain `X.Y.Z` (existing-tag guard prevents re-release) and tags HEAD directly when the release version equals the current version. The reviewer judged this the only spec-coherent reading; the contradiction is in the AC wording.
- Shared worktree note: ticket-05's commits landed mid-ticket (`43ef872`, `9070e19`, `b992036`, `43a9fda`); they did not touch this ticket's files and this ticket's stage excluded the sibling's in-flight edit to `issues/01-manual-github-setup.md`.