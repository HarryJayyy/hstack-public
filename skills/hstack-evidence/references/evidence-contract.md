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

For consequential expectations, record the source/derivation separately from the changed implementation. For material observations, distinguish system-observed, actor-reported, provider-confirmed and inferred facts and their limitations. Use [adaptive-verification.md](adaptive-verification.md) for selection and failed-loop handling. These annotations do not expand the existing machine receipt schema or certify observation truth.
