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