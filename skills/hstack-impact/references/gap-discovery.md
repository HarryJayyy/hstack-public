# Targeted Gap Discovery

Use when acceptance behavior is incomplete or the change crosses a material boundary. Skip for isolated content edits and already-covered local fixes. Discovery is task-specific, not an exhaustive enterprise assessment.

## Select relevant questions

- **Access:** who may act, through which direct/server paths, and under which ownership scope?
- **Identity and recovery:** what distinguishes retry from new intent; does the identity survive reload, restart, storage failure and timeout with unknown outcome?
- **Consumers:** which reports, allocations, cached balances, jobs or external contracts use the changed state?
- **Lifecycle:** what happens on correction, reversal, cancellation or an approved source-document change?
- **Partial effects:** which writes are atomic; what can fail after acceptance, and how is divergence reconciled?
- **Observability:** what can actually be observed, what is merely reported, and which claim remains unprovable with the available access?

Select lenses from traced boundaries, not keywords alone. Read the smallest relevant source and host records to resolve existing answers. Expand context only when a dependency or contradictory observation justifies it. Optional graphs help locate artifacts but never establish approval or correctness.

## Resolve and proceed

1. Record answered material questions in the existing contract with source locations. Do not require another document if the host's brief already holds the answers.
2. Separate a missing engineering detail from a consequential policy choice. Choose a reasonable reversible implementation detail within scope; do not invent money, legal, access, retention or finality policy.
3. Ask only the unresolved decisions that change acceptance or authority, with a concrete example and trade-off. Reuse prior approvals and summarize newly approved deltas rather than asking again.
4. If a decision blocks one criterion, name that dependency. Continue independent authorized work where safe; do not use preparation as a reason to execute the blocked behavior.
5. Convert selected gaps into focused observations, including downstream readbacks and failure/recovery cases. A broad passing suite does not remove a known uncovered gap.

Keep requirement provenance in the host repository. Do not add a compulsory ontology, graph engine, fixed question count or external source monitor to HStack merely to complete discovery.
