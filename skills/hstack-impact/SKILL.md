---
name: hstack-impact
description: Define a change contract and trace blast radius across code, data, state transitions, jobs, integrations, permissions, operations, and adjacent workflows. Use before implementing any non-trivial feature, bug fix, refactor, migration, or cross-system change.
---

# HStack Impact

Turn the request into explicit invariants and evidence obligations before editing.

## Change contract

Write the fields in [change-contract.md](references/change-contract.md). Mark unknown policy rather than filling it with an assumption. If an unknown changes money, legal obligations, access, retention, or irreversible lifecycle behavior, stop with `BLOCKED BUSINESS DECISION`.

## Blast-radius procedure

1. Start from the entry point: UI action, API, job, hook, migration, import, or operator command.
2. Trace callers and consumers using symbol references, imports, framework conventions, hooks, raw SQL/RPC, queues, events, scheduled jobs, and generated artifacts.
3. Map reads, writes, constraints, derived state, caches, reports, external messages, and audit records.
4. Identify transactions and gaps between transactions. Mark replay, retry, ordering, and concurrent execution behavior.
5. Enumerate primary, failure, rollback/recovery, and adjacent regression paths.
6. Select verification at every material boundary, including readback of durable values.

Use [blast-radius.md](references/blast-radius.md) as the checklist. Do not equate "no static importer" with "unused"; validate framework entrypoints and dynamic dispatch.

## Output

Produce a compact change contract, a dependency map, risk overlays, excluded scope, and required proof. Keep target facts tied to source locations or runtime observations.
