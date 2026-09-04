# Cross-Module Event Proof

Use `hstack-event-proof/v1` when one authorized business event must cause or forbid reactions across
multiple modules. The receipt keeps three graphs separate:

1. **Expected graph:** policy-owned reactions, invariants, expected effects, dependencies,
   cardinality, and readback obligations.
2. **Implementation graph:** the exact source entrypoints, mechanisms, and transaction boundaries
   that can perform each expected reaction.
3. **Observed graph:** matching-SHA runtime observations and artifact-backed counts for each expected
   reaction.

The schema is `schemas/event-proof-receipt.schema.json`; semantic enforcement is provided by
`validateEventProofReceipt()` in `lib/event-proof.mjs`. A generic `hstack-evidence/v1` envelope may
carry an event-proof receipt as an artifact, but generic findings or artifact names cannot replace
the event receipt.

## PASS requirements

`PASS` is derived, never trusted from the receipt. It requires:

- every required expected reaction has exactly one implementation mapping and one observed result;
- dependencies are known and acyclic, cardinality is valid, and observed counts are within bounds;
- exact repository SHA, environment/deployment identity, fixture, observation time, business event
  ID, correlation ID, and idempotency key;
- feature-flag source, evaluation context, RFC 8785 canonical digest, and artifact evidence;
- before/after durable readback for every reaction whose policy requires it;
- atomic core, async delivery, replay, concurrency, wrong-role, wrong-tenant, partial-failure,
  correction/reversal, and reconciliation proof, or an authoritative `NOT_APPLICABLE` decision;
- artifact digests, capture times, producer identity, and redaction classification;
- owned-resource cleanup plus absence readback, or authoritative `NOT_APPLICABLE` for a read-only
  procedure that created nothing;
- one successful negative control bound to the same proof contract version, exact code SHA, and safe
  isolated environment class.

## Safe negative controls

Negative controls mutate or substitute the isolated test contract, not staging or production
business data. Accepted environment classes are `local-isolated`, `ephemeral-test`, and
`dedicated-test`. A control may be reused for multiple transaction receipts while its proof-contract
version, repository SHA, and environment class remain identical. A changed binding invalidates it.

The control must prove that at least one removed, duplicated, miscalculated, or unauthorized reaction
causes the contract to fail. HStack never requires intentional corruption of staging or production.

## Non-proof boundaries

- A diagram is navigation, not runtime proof.
- An API or HTTP 200 response is insufficient without the required downstream observations.
- A test filename proves that a test exists, not that it ran on this SHA and environment.
- A build proves construction, not business behavior.

Visualization adapters, including Archify, may render validated receipt facts. They are optional,
must not infer missing reactions or policy, and cannot change the receipt state.
