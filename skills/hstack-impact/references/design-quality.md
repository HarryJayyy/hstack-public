# Design and Implementation Quality

Use for non-trivial interfaces, ownership, or structural changes. An obvious bug fix need not produce competing architectures.

## Design checkpoint

- Ground the actual callers, data lifetime, failure behavior, and host abstractions. Record an important existing rationale when changing it; do not guess why a boundary exists.
- Sketch a caller's usage, then the minimal interface and owned state needed to support it. Include error/async semantics and a practical test seam before filling in implementation.
- Compare structurally different approaches when the design is contested or costly to reverse. Assess correctness, migration cost, information hiding, operational visibility, testability and total complexity. More models are optional; agreement is not proof.
- Prefer an interface that hides implementation rules. Flag pass-through layers, leaked storage details, implicit call ordering, duplicated authoritative state, and abstraction whose callers must understand internals.
- Record the chosen approach, rejected alternative and material trade-off proportionately. Pause for owner decisions about policy or irreversible behavior, not every reversible design choice.

## During implementation

- Keep behavior verifiable in coherent slices. Test the contract rather than the internal function arrangement; use failing-before evidence where practical for defects.
- Validate input at the owning boundary and make invalid states explicit using the host's language conventions. Do not require TypeScript or introduce a new framework into a different-language repository.
- Handle cancellation, retries, concurrency and partial state only where the boundary requires them. Do not solve shared-state problems with a lock before examining ownership and isolation.
- Preserve rationale comments and public documentation that explain non-obvious constraints. Remove misleading or redundant commentary selectively, not through blanket comment stripping.
- Re-ground when repeated same-shape workarounds, caller escape hatches, or incompatible ownership assumptions appear. Distinguish inherent domain complexity from a poor abstraction; redesign only within authorized scope.

## Closeout checkpoint

Compare acceptance behavior, final public surface, migrated callers, test observations, and operational effects. Report deviations from the sketch and unresolved limitations. Code elegance is a review judgment; durable correctness still requires the evidence skill.
