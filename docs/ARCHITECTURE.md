# HStack Architecture

## Control flow

```text
request
  -> law/ownership and explicit authority
  -> host mandatory rules and HStack safety floor
  -> project profile and task execution budget
  -> read-only open-work reconciliation
  -> playbook + risk overlays
  -> change contract + blast radius
  -> bounded execution
  -> domain and host verification
  -> exact-state evidence + verdict
```

The JavaScript router is deterministic and intentionally small. It classifies; it does not edit code
or call models. Skills provide reasoning contracts. Profiles adapt those contracts to a repository.
Inventory and fingerprint tools collect local evidence without mutating the target repository.

Natural-language task text is untrusted advisory classification input. The router may recommend a
playbook, overlays, and declared operations, but it never produces `executionReady`. Hashing the
request provides freshness or traceability only and cannot prove semantic classification.

Execution readiness belongs to a separate structured evaluator that rejects free-text request
fields. Its operations derive capabilities, mutation capabilities require explicit current-task
authorization, and concurrency remains fail-closed. An optional `sourceRequestDigest` links the
execution record to earlier text for audit purposes but has no authority effect. This separation is
the v0.4.1 local trust model; HStack does not claim a trusted classifier or runtime sandbox.

Repository adapters normalize GitHub pull requests and GitLab merge requests. Identity correlation
uses the source owner/project plus exact SHA. CI, framework, and deployment adapters are declared in
the profile; an exact deployment identity is required at runtime before live evidence can be bound.

## Trust boundaries

- **User authority:** defines permitted outcome and consequential actions.
- **Host repository:** defines source, architecture, contribution, test, merge, and release rules.
- **HStack:** adds risk detection, dependency mapping, evidence requirements, and verdict vocabulary.
- **Business owner:** defines financial, tax, lifecycle, authorization, and operational policy.
- **Environment:** supplies runtime evidence; an unavailable or stale environment cannot be treated as
  passing evidence.

No layer can silently grant authority held by another.

Capabilities are declared independently for `read`, `edit`, `push`, `merge`, `deploy`, `delete`, and
`public-disclose`. A declaration of availability is not current authorization. Concurrency is bounded
per owner, per worktree, and per named change lane. Missing observed counts leave execution readiness
`UNKNOWN` even when task classification and authorization are otherwise valid.

## Data handling

The router processes task text, paths, and profile metadata locally. Inventory shells out to read-only
Git and GitHub CLI commands. Fingerprinting hashes tracked diffs and status plus metadata for untracked
files; it does not read untracked-file contents. HStack has no runtime package dependencies.

Public inventory and fingerprint output use explicit aggregate-only projections that omit repository
identity, refs, paths, change metadata, and state digests. General handoff redaction requires
caller-supplied sensitive values and remains defense in depth for an approved shape; it cannot certify
arbitrary JSON or text as public-safe. These controls reduce accidental disclosure but never grant
permission to publish.
