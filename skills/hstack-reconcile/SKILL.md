---
name: hstack-reconcile
description: Inventory branches, worktrees, dirty state, remotes, and pull requests without deleting or rewriting work. Use before starting or ending non-trivial changes, during handoffs, or when a shared repository contains uncertain concurrent work.
---

# HStack Reconcile

Produce a read-only snapshot before mutation and again at closeout.

## Procedure

1. Record repository path, current branch, HEAD, remotes, base branches, and whether the current worktree is dirty or untracked.
2. Run the installed runtime when available: `hstack inventory --repo <path> --profile <profile>`.
3. Treat remote-tracking refs as local observations. Record `FETCH_HEAD` time and TTL; if current remote truth is required, fetch separately only when authorized.
4. Correlate pull/merge requests by provider, source repository owner/project identity, and exact head SHA, not branch name alone.
5. Classify every branch and attached worktree with the preserve-first categories in [classification.md](references/classification.md).
6. Never clean as a side effect of inventory. Cleanup requires explicit targets, ownership/reachability checks, and separate authorization.
7. Emit the `hstack-evidence/v1` JSON envelope as the canonical evidence; Markdown is only a rendering.
8. At end, repeat the snapshot and write the durable handoff from [handoff.md](references/handoff.md).

## Safety rules

- Preserve dirty, untracked, attached, unmerged, mismatched, parked, and unknown state.
- A merged branch is only a cleanup candidate, never automatic permission to delete it.
- Do not infer that a branch is abandoned because its PR is closed or absent.
- Do not expose untracked-file contents while fingerprinting; metadata and hashes of tracked diffs are sufficient.
- An inaccessible worktree is `UNKNOWN`, not clean. A provider/API failure is `INCOMPLETE`, not zero open work.

## Installed runtime

Resolve the HStack plugin root from this `SKILL.md` location by moving up two directories, then run
`node <plugin-root>/bin/hstack.mjs inventory ...` or `fingerprint ...`. Never invoke a same-named
`npm` script in the host repository, and never treat runtime availability as cleanup authority.
