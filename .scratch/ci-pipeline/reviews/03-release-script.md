# Review: 03-release-script

Reviewed the working-tree diff for `ticket done: 03-release-script` (fixed point `a38fc0b`; landed as commit `d05bbea`; sibling ticket-05 commits in between are out of scope) on two axes in parallel, per the code-review skill. Both axes ran read-only against the uncommitted state.

## Standards

Reviewed against AGENTS.md, `app-npm-scripts`/`app-arc42-docs`/`app-reformat-files`/`ponytail` skills, eslint.config.js, docs/arc42. Tooling confirmed green (`node --check` + `eslint` on the new script and config block).

- package.json `release` script — compliant (non-`lint:` name keeps it out of `lint:*`/`verify` wildcards; placement sane).
- eslint.config.js `scripts/**/*.mjs` node-globals block — idiomatic, mirrors the existing `scripts/**/*.ts` block; required, since `eslint.configs.recommended`'s `no-undef` would otherwise flag `process`/`console` and break `eslint . --max-warnings 0`.
- scripts/release.mjs — stdlib only (`node:child_process`/`node:fs`/`node:path`), no dependencies, `function` declarations, ponytail comments name ceiling + upgrade path. Two findings:

1. **Misleading guard-order header comment (fixed).** Header listed dirty tree before the version guard, but `main()` runs the version plan first. Reordered the comment to match the code.
2. **Duplicated version source of truth — `package-lock.json` (worst, fixed).** The manual `setVersion` rewrote only `package.json`; the lockfile carries the version too (root + `packages[""]`), so after a release the lock went stale and a later `npm install` would re-write it — leaving a dirty tree that trips the very dirty-tree guard on the next release. Now `setVersion` runs `npm version --no-git-tag-version` (platform-blessed bump; updates package.json + package-lock.json, no git side effects) and both files are staged in each bump commit.
3. **No runnable check shipped (accepted).** AGENTS.md's laziness rule wants one runnable check for non-trivial logic; the spec "Testing Decisions" explicitly exempts this script from the coverage surface and unit tests, and the skill gotcha now documents that. Covered instead by the manual first-release run (ticket 06) and by the isolated scratch-repo harness executed during this ticket (36 assertions across 6 scenarios, kept outside the repo).
4. **arc42 README "last verified" not bumped in the diff (handled).** Per the ticket-02 precedent (`a5d68d4`) the bump landed as a follow-up docs commit `a6ba88f`, pointing at `d05bbea`.

## Spec

Verified against `.scratch/ci-pipeline/spec.md` (Implementation Decisions: Release script + Versioning scheme; Testing Decisions; Out of Scope) and `.scratch/ci-pipeline/issues/03-release-script.md`. All five ACs implemented:

- AC-1: verify gate runs and its failure aborts before any commit/tag; guarded by cheap state checks first.
- AC-2: from `-dev` → strip to `X.Y.Z`, commit, annotated `vX.Y.Z`, bump back to `X.Y.0-dev`, commit. Annotated tag verified (`cat-file -t` → `tag`).
- AC-3: never pushes; prints `git push` and `git push --tags`.
- AC-4: loud refusal on dirty tree / existing tag / version that is not a valid release start.
- AC-5: standalone `scripts/release.mjs`, outside the vitest coverage include (`src/**` only), no unit tests, nothing wired into `verify`.

One deviation, judged justified:

- **AC-4's literal wording "version does not end in `-dev`" vs the plain-`X.Y.Z` first-release bootstrap.** The spec's own versioning line "current `1.0.0` is the first release target" and its example "`1.0.0` → tag `v1.0.0` → `1.1.0-dev`" (spec.md:47-48) require accepting the current plain `1.0.0`; a strict suffix check would block the first release forever. The script accepts `X.Y.Z` (with the existing-tag guard preventing re-release) and, when the release version equals the current one, tags HEAD directly (no empty bump commit) — the deploy-time guard still sees a matching version at the tagged commit. The contradiction lives in the AC wording, not the code; recorded in the ticket Comments.

No scope creep: the eslint block is required for the lint gate, the skill row/doc update and arc42 §7.6 are per repo rules, ADR-0028 already committed.

## Summary

Standards: 4 findings, 2 fixed pre-commit (header order, lockfile sync), 1 accepted judgement (untested seam exemption), 1 handled by follow-up docs commit; worst was the lockfile drift, fixed. Spec: 0 missing, 0 creep, 1 justified deviation (plain `X.Y.Z` bootstrap coerced by the spec's own example). No cross-axis conflict. Nothing remained to fix, so no `review-fixed` commit was needed.