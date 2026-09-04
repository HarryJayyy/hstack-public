# Evidence Contract

For each material claim, record:

- claim and protected invariant;
- risk if the claim is false;
- exact command or manual procedure;
- repository and commit/worktree fingerprint;
- environment, service version, and data/fixture identity;
- expected observable result;
- actual result and durable artifact/log location;
- execution time and freshness window;
- what the check cannot prove;
- invalidation triggers requiring rerun.

Prefer independent readback over assertions derived from the same code path that performed the write.
