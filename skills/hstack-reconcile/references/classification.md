# Preserve-First Classification

Use one of these categories:

- `BASE BRANCH - PRESERVE`
- `OPEN PR #N`
- `OPEN PR #N SHA MISMATCH - PRESERVE`
- `ATTACHED, STATE UNKNOWN - PRESERVE`
- `ATTACHED, DIRTY - PRESERVE`
- `ATTACHED + MERGED - REVIEW BEFORE CLEANUP`
- `ATTACHED, UNMERGED, NO OPEN PR - PRESERVE`
- `MERGED CLEANUP CANDIDATE (...) - VERIFY`
- `UNMERGED, NO OPEN PR - PRESERVE`

Cleanup eligibility requires all of: exact target, clean state, detached worktree or approved removal, merged/reachable confirmation, no active owner, no parked work, and explicit authorization.
