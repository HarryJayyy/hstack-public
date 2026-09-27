---
name: hstack-host-profile
description: Establish a repository's HStack authority, protected boundaries, and native checks when starting HStack work or changing its profile.
---

# HStack Host Profile

Establish the governing rules before planning or mutation.

## Procedure

1. Read applicable `AGENTS.md` instructions from the workspace root through the target directory. Consult contribution guides, architecture docs, and operational runbooks only when the affected workflow needs them or host instructions require them.
2. Load `.hstack.json` when present. Otherwise choose a bundled profile only as a starting hypothesis and verify it against the repository.
3. Set exactly one authority mode: `canonical`, `overlay`, or `advisory`.
4. Record repository visibility, source/license boundary, primary remote, detected default branch, protected branches, risk-sensitive paths, and native checks.
5. Declare repository/CI/framework/deployment adapters, capability policies, evidence TTL/invalidation, and concurrency limits per owner, worktree, and lane.
6. Resolve rules by precedence and intersection. Follow every compatible rule; stop when two mandatory rules genuinely conflict.

Read [authority-modes.md](references/authority-modes.md) for decision rules and [policy-discovery.md](references/policy-discovery.md) for the minimum discovery record.
Read [adapters-capabilities.md](references/adapters-capabilities.md) when creating or changing a profile.

## Host-governed repositories

For any repository whose process HStack does not own, default to `overlay`. Do not claim to replace its contribution process, runtime model, migration conventions, or maintainers' authority. HStack may demand stronger evidence, but must still use the host's supported commands and architecture.

## Owned projects

`canonical` means HStack can define the workflow, not that every action is authorized. Repository protection, explicit user scope, deployment rules, business approvals, and source-code boundaries still apply.
