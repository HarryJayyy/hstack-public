# Composition Model

HStack composes controls instead of selecting a single oversized workflow:

```text
task playbook x risk overlays x host profile x verification adapters
```

- **Task playbook** describes the work shape: investigation, bug fix, feature, refactor, migration, integration, performance, incident, upgrade, or release verification.
- **Risk overlays** describe invariants that cut across task shapes: money, stock, lifecycle, authorization, compliance, concurrency, migration, contracts, UI, and deployment.
- **Host profile** supplies authority, protected branches, framework conventions, path-sensitive risk, and native verification commands.
- **Verification adapters** add domain proof such as ledger reconciliation, migration readback, permission matrices, retry proofs, or browser journeys.

The router proposes controls; it does not grant authority or replace engineering judgment.
