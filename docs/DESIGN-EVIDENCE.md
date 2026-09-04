# Design Evidence

## Private host change-control case

Historical observation captured at `2026-08-29T14:09:07Z` from a private repository's pull-request
and read-only Git/worktree metadata. This record is design provenance, not current status.

- The change head and remote head matched exactly, while a prose status section already contained a
  stale dirty-worktree count.
- The CI lifecycle was complete and failed: a large static integration suite passed, a separate live
  contract check returned an unexpected server error, and quality plus review-policy gates failed.
- No approval was present. The correct closeout therefore required separate correction,
  investigation, and review-policy components rather than the single phrase "CI pending."
- Read-only inventory had to distinguish 36 branches requiring individual review, two preserved base
  branches, and two separately labelled cleanup candidates. No cleanup was authorized or performed.

This case directly motivated timestamped evidence envelopes, repository/remote/default-branch/SHA
identity, TTL and invalidation, exact source-repository change correlation, separate machine exit
states, confirmed-clean versus unknown worktree counts, and composite human verdicts.

## Source boundary

No host documentation or source code is copied here. Only generalized control failures and derived
requirements are retained. The observation must be refreshed from the live host before making any
new claim about that pull request or repository.
