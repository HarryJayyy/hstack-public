# Engineering Workflows

Use only the selected workflow. Reuse the host's tooling, current impact map, and verified facts. A small reversible task needs a small contract, not every ceremony below.

## Investigation

1. State the question and the smallest observable symptom. Capture environment and baseline without changing the system.
2. Trace the relevant entry point through consumers and state. Separate observed facts from competing explanations.
3. Choose a discriminating check: predict what each hypothesis would produce, then inspect the narrowest safe signal.
4. Stop when evidence answers the question or the authorized budget is exhausted. Report a proven cause only when the evidence rules out material alternatives; otherwise report a plausible mechanism and the next discriminating check.

An investigation does not silently become implementation. Reviews return findings and locations, not unsolicited fixes.

## Bug fix

1. Identify intended behavior from policy or an existing contract, not from the buggy code.
2. Prefer a cheap local regression that fails for the intended reason before the fix. If impractical, explain why and capture the closest executable reproduction; avoid broad fixture churn or tests that merely echo mocks.
3. Fix the causal path with the smallest coherent change. Do not weaken assertions to make the implementation appear correct.
4. Re-run the regression and affected adjacent checks on the final state. If subsequent edits invalidate a result, refresh only the affected evidence.

Repeated workarounds for the same cause are a signal to re-ground the design, not keep adding branches.

## Feature

1. Define the actor, observable acceptance criteria, failure behavior, excluded scope, and material policy questions.
2. Map existing behavior and reuse native abstractions. For a non-trivial new boundary, use the impact skill's design-quality checkpoint.
3. Implement one coherent vertical slice through input, transition, observation, and error handling. Keep each slice independently checkable.
4. Exercise primary and meaningful failure paths, affected permission boundaries, and durable downstream effects. Use a project verification guide when one exists.
5. Compare the final artifact with acceptance criteria; clearly identify partially implemented or unverified criteria.

## Refactor

- Freeze observable contracts with existing tests or a representative baseline.
- Map dynamic as well as static consumers. Move behavior in reversible slices; keep compatibility only where actual callers need it.
- Compare outputs and side effects before/after. Remove the obsolete path only after establishing caller migration; do not delete merely because imports are absent.

## Data migration

- Record forward semantics, source/target identity, counts and value invariants, compatibility window, and supported recovery. Do not assume rollback is possible after destructive transformation.
- Rehearse against an owned representative fixture; exercise partial execution and retry. Read stored values independently and compare expected counts and relationships.
- A rehearsal is not deployment authority. Report the deployed schema/version only after observing it in the authorized target environment.

## Integration

- Establish contract version, ownership, authentication, idempotency key, ordering, timeout semantics, and reconciliation boundary.
- Replay success, rejection, duplicate, and unknown-outcome cases that affect the requested change. Distinguish remote acceptance from local persistence.
- Verify both sides where authorized; identify unobservable external effects as missing proof rather than a pass.

## Performance forensics

- Capture a representative baseline with workload, environment and measurement variability.
- Trace a concrete bottleneck, predict the effect of one causal change, and compare like-for-like measurements with correctness checks.
- Do not infer improvement from code shape or one noisy timing. Stop unchanged reruns when they cannot discriminate the hypothesis.

## Production incident

- Establish incident scope, available authority and current health; preserve logs and affected identities.
- Prefer the safest authorized reversible stabilization. Escalate an unavailable rollback or consequential policy decision.
- Verify recovery on actual runtime behavior, retain remaining uncertainty, and leave causal remediation separate if outside scope. Do not deploy or mutate production merely because this workflow was selected.

## Upgrade/backport

- Read authoritative version/migration notes. Map changed APIs, persisted formats, dependencies, runtime and build compatibility.
- Apply isolated compatibility changes; test the supported version matrix and recovery path proportionate to risk.
- Record unsupported combinations explicitly rather than presenting one successful build as full compatibility.

## Release verification

- Match artifact, exact code state, deployment identity, configuration and environment before making release claims.
- Run required functional observations and the host's monitoring window only when authorized. Use the product's recurring mechanism for deferred monitoring.
- Reconcile CI, review and deployed behavior separately. Pending, failed or mismatched evidence cannot become a release pass.
