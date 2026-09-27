# Adaptive Verification

## Establish the expectation

For consequential calculations or transitions, identify how the expected result was derived separately from the changed implementation. Prefer an approved example, independently calculated invariant, source-backed reference dataset or justified independent review. Existing trusted host tests can suffice for a bounded regression; do not demand a second model for every edit.

Do not use the same function, derived value or shared mistaken assumption as both implementation and oracle. Record the expectation source, derivation and limitations. Independent model agreement is review input, not proof that a source is correctly interpreted. A negative control establishes that the check detects a selected error; a retry scenario alone does not establish that sensitivity.

## Classify what the observation supports

- `system-observed`: directly inspected stored state, output or execution behavior.
- `actor-reported`: an actor asserts that an action occurred.
- `provider-confirmed`: a provider acknowledges a specified outcome; distinguish receipt/acceptance from settlement or completion.
- `inferred`: an interpretation of indirect signals, not a direct observation.

Mixed observations should be listed separately. These labels are descriptive annotations, not new HStack verdicts or cryptographic trust levels. Record who/what produced the observation and what it cannot establish. A system can prove that an actor's report was stored correctly without proving the reported physical action occurred. Limit the claim accordingly instead of blocking unrelated record-handling behavior.

## Choose the next check

1. Name the criterion and uncertainty the check will resolve. Use the nearest supported harness; select failure/recovery and downstream observations from traced effects, not the entire catalog.
2. Run focused checks during implementation and mandatory aggregate gates at the host-required boundary. Do not omit a mandatory gate because a cheaper check passed.
3. Match evidence to final code/worktree, environment, fixture, configuration and time. Refresh only invalidated results; still-valid checks and approval records remain reusable.
4. For failure, separate a demonstrated product defect, harness defect, unavailable environment and ambiguous observation. Record the exact signal rather than summarizing all four as "tests failed."
5. Before repeating, identify what changed and why another attempt can discriminate the cause. A bounded rerun can investigate a suspected transient local failure; retain both results and do not silently replace failure with the later pass.
6. Stop unchanged failing, unavailable, destructive or rate-limited loops. Record the failure signature, hypothesis, last attempt, exhausted budget, missing condition and next discriminating action. Required unresolved evidence remains failed, incomplete or unknown; do not downgrade the gate to obtain a pass.

Deferred watches use the host/product's requested monitoring mechanism, not a sleeping shell or an implied perpetual agent. Fixing an unrelated discovered defect or changing a test environment still requires appropriate scope and authority.
