# Profile Reference

Place `.hstack.json` in a target repository or pass a bundled/explicit profile to the CLI.

## Required fields

| Field | Meaning |
| --- | --- |
| `schemaVersion` | Must be `1`. |
| `name` | Stable profile name. |
| `authorityMode` | `canonical`, `overlay`, or `advisory`. |
| `provider` | Repository provider: `github` or `gitlab`. |
| `primaryRemote` | Remote used for base-branch reachability checks. |
| `baseBranches` | Branches against which work is reconciled. |
| `protectedBranches` | Branches HStack must treat as protected. |
| `publicHandoffs` | Whether handoff content is expected to be public-safe. |
| `frameworkProfiles` | Framework conventions that must be considered. |
| `capabilities` | Policies for read, edit, push, merge, deploy, delete, and public disclosure. |
| `concurrency` | Limits per owner, worktree, and named lane. |
| `evidence` | TTL and invalidation triggers. |
| `adapters` | Repository, CI, framework, and deployment-identity providers. |
| `riskRules` | Path-prefix rules that add domain overlays. |
| `verification` | Native type, unit, integration, build, and live procedures. |

## Risk rule

```json
{
  "name": "database-and-auth-high-risk",
  "pathPrefixes": ["database/migrations/", "src/auth/"],
  "overlays": ["data-migration", "authorization"]
}
```

Path matching is repository-relative and prefix-based. Keep rules precise: unrelated paths should not
inherit every high-risk overlay.

## Capability policy

Each capability is `allowed`, `requires-explicit-authorization`, or `disabled`. Profiles never record
task-specific permission; that comes from current explicit user authorization. Proprietary profiles
should set `public-disclose` to `disabled`.

`publicHandoffs` controls whether public-safe rendering is expected; it does not grant publication.

## Concurrency

`perOwner` and `perWorktree` are positive integers. `lanes.default` is required; additional lanes such
as `database`, `financial`, or `release` can use stricter limits. Counts describe already-active work,
so a new change violates a limit when the observed count is greater than or equal to that limit.

## Adapters and freshness

Repository adapters support `github` and `gitlab`; CI adapters support `github-actions`, `gitlab-ci`,
`external`, and `none`. The repository adapter discovers the default branch. Profile base branches
remain fallbacks and additional integration branches.

Evidence records `ttlSeconds`, observation/expiry timestamps, and invalidation triggers. Missing fetch
time is `UNKNOWN`; expired fetch evidence is `STALE`. An inaccessible worktree is never counted clean.

## Adoption

Start with `overlay`, validate the profile against real work, and move to `canonical` only through an
explicit owner decision recorded in the repository. Use `advisory` for review-only contexts.
