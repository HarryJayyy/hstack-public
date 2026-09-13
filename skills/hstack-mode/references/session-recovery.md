# Session Recovery

## Pause

- Pause only when requested, at an atomic boundary. Do not start unrelated work to make the handoff appear complete.
- Inspect the current diff, processes, branch and evidence state. Preserve unrelated work. Do not stash, commit, push, terminate processes, or clean merely to pause; perform only already-authorized operations on owned work.
- Write a host-approved durable note when edits are authorized; otherwise return the capsule directly. Include objective, exclusions, authority, decisions and rationale, completed/pending acceptance criteria, repository/branch/HEAD/worktree fingerprint, owned processes/fixtures, evidence paths and invalidation, blockers, and the first next action.
- Record a broken or partial state honestly. A WIP commit is optional and requires appropriate authorization and host conventions, not a universal pause rule.

## Pick up

1. Read the supplied capsule and relevant final portion of the previous trail. Scope transcript access to this task/repository; do not mine unrelated private chats. If unavailable, request or reconstruct the missing facts from the repository.
2. Check current branch/diff and relevant PR/runtime identities. Treat the trail as decision context, not proof that today's state still matches it.
3. Reuse completed work and still-valid evidence. Refresh only claims invalidated by code, environment, fixture, configuration, time, or a conflicting observation.
4. List inherited decisions, verified completed work, remaining work, and the resume point. Route the remainder to its engineering workflow within existing authorization.

Do not confuse `resume requested` with new merge, deployment, deletion, or disclosure authority. A current capsule should avoid a full re-investigation; a stale claim should not bypass verification.
