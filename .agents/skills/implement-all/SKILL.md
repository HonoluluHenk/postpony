---
name: implement-all
description: "Implement every ticket of one feature folder under `.scratch/` (spec + issues). One feature worktree for the whole spec, one subagent per ticket following the `implement` skill; each subagent ticks and commits its own ticket."
disable-model-invocation: true
---

# Implement All Tickets

Implement every ticket of one feature folder under `.scratch/`, all in one feature worktree by parallel subagents. Each subagent must follow the `implement` skill.

## 1. Resolve the feature

- Use the folder the user named, if any.
- Otherwise list the folders under `.scratch/` and ask which to implement — offer each folder as an option; the user may name another.
- Folder or `spec.md` missing: tell the user and stop. No tickets under `issues/`: tell the user and stop.

Done when: `spec.md` and every ticket are read, and each ticket's `Blocked by:` line is noted.

## 2. Mark a ticket done

The subagent ticks each `- [ ]` box in its ticket file as soon as that acceptance criterion is implemented — intermediate ticks stay uncommitted, so progress is visible live in the worktree. When the implementation is done, it commits the ticked file with the implementation (step 4). Once the ticket is finished (implemented, reviewed, fixed), it appends a `## Comments` line with the commit SHAs and a one-line summary and commits that as the ticket's final step.

Done when: every box is ticked and the comment carries the SHAs, committed on the feature branch.

## 3. Set up the feature worktree

- `git worktree add -b <feature> ./worktrees/<branch>` from current HEAD, then run `/setup-worktree` inside it (`--quick` unless any ticket's acceptance criteria include e2e). If this skill/command does not exist: tell the user and stop!

Done when: the worktree is up and its tests run.

## 4. Work the frontier

Repeat until every ticket is done. The **frontier** is the set of undone tickets whose blockers are all done.

1. Dispatch each frontier ticket to a subagent, in parallel, given the worktree path, the ticket path, and the spec path — told to **load the `implement` skill and follow it**, plus implement-all's own rules:
    - tick each `- [ ]` box in its ticket file as that criterion is completed (step 2);
    - commit per step with explicit paths and a message naming the step — `ticket done: <NN>-<slug>` (implementation plus the ticked ticket file), `review: <NN>-<slug>` (findings saved to `.scratch/<feature>/reviews/<NN>-<slug>.md`), `review-fixed: <NN>-<slug>` (only when fixes are needed); the worktree is shared, so stage only the ticket's own files, never `git add -A`;
    - append the `## Comments` line and commit it (step 2), then report the commit SHAs.
2. Confirm each finished subagent's commits appear in the worktree's log.

Parallel tickets share one working tree, so tickets editing the same files run one at a time. Any further step earns its own commit named after it. If the frontier is empty but tickets remain, a blocker stalled or failed: report it and ask the user how to proceed.

Done when: every ticket is ticked and committed on the feature branch.

## 5. Final gate

If the source branch (usually `main`) changed in the meantime:

- reintegrate it into the feature branch
- resolve merge conflicts
- verify using `npm run verify`. Merge the feature branch into the current branch — ask first if the current worktree has uncommitted changes; resolve small conflicts yourself, ask the user on anything non-trivial; confirm the ticked ticket files came back. Then run `npm run verify` once and report the result. On failure, report and ask the user whether to fix or stop. Offer to remove the feture worktree.

Done when: verify passed, or its failure is reported and the user decided.
