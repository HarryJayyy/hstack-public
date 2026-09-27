---
name: hstack-impact
description: Map dependencies, durable-state effects, and required proof for changes crossing module, data, permission, or integration boundaries.
---

# HStack Impact

Turn the request into explicit invariants and evidence obligations before editing.

## Change contract

Use [change-contract.md](references/change-contract.md) for a formal change contract; include only relevant fields for a bounded local change, unless the host requires the full record. Mark unknown policy rather than filling it with an assumption. If an unknown changes money, legal obligations, access, retention, or irreversible lifecycle behavior, stop with `BLOCKED BUSINESS DECISION`.

Use [gap-discovery.md](references/gap-discovery.md) when the request may omit material acceptance behavior or boundary effects. Inspect existing answers first; do not turn discovery into a mandatory questionnaire.

## Blast-radius procedure

1. Start from the entry point: UI action, API, job, hook, migration, import, or operator command.
2. Trace callers and consumers using symbol references, imports, framework conventions, hooks, raw SQL/RPC, queues, events, scheduled jobs, and generated artifacts.
3. Map reads, writes, constraints, derived state, caches, reports, external messages, and audit records.
4. Identify transactions and gaps between transactions. Mark replay, retry, ordering, and concurrent execution behavior.
5. Enumerate primary, failure, rollback/recovery, and adjacent regression paths.
6. Select verification at every material boundary, including readback of durable values.

Use [blast-radius.md](references/blast-radius.md) as the checklist. Do not equate "no static importer" with "unused"; validate framework entrypoints and dynamic dispatch.

For a non-trivial design or structural change, use [design-quality.md](references/design-quality.md) to compare interfaces, test seams, and implementation alternatives. Do not require competing designs for an obvious local fix.

## Output

Produce a compact change contract, a dependency map, risk overlays, excluded scope, and required proof. Keep target facts tied to source locations or runtime observations.
