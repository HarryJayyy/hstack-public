---
name: hstack-invariants
description: Protect durable business and system invariants across money, inventory, lifecycle, authorization, compliance, asynchronous work, and integrations. Use when technically valid code could still leave persisted or externally visible state incorrect.
---

# HStack Invariants

Use this skill when correctness depends on relationships across modules or stores rather than one function returning successfully. Read only the references selected by the routed overlays.

## Mandatory rules

- Never treat compilation, unit tests, or UI success as sufficient proof of ledger or stock correctness.
- Preserve posted history. Corrections normally require auditable reversal/amendment semantics, not silent mutation.
- Keep source documents, durable entries, derived balances, and reports reconcilable.
- Define precision, rounding, currency, effective date, posting date, company, warehouse, and jurisdiction explicitly where relevant.
- Exercise cancellation, amendment, retry, concurrency, and partial-failure paths, not only creation.
- Do not invent policy. Unknown tax, recognition, valuation, approval, or release behavior is `BLOCKED BUSINESS DECISION`.

## Overlay routing

- Read [document-lifecycle.md](references/document-lifecycle.md) for submitted/finalized state or approval changes.
- Read [money-ledger.md](references/money-ledger.md) for accounting, payments, invoices, payroll, tax, or currency.
- Read [stock-valuation.md](references/stock-valuation.md) for inventory, warehouses, serial/batch, costing, or backdating.
- Read [procurement.md](references/procurement.md) for requests, orders, receipts, bills, returns, and supplier controls.
- Read [async-integrations.md](references/async-integrations.md) for jobs, imports, webhooks, sync, or external accounting.
- Read [regional-compliance.md](references/regional-compliance.md) for statutory or jurisdiction-specific behavior.

## Proof pattern

For each affected business event, prove: authorized input -> transition -> durable entries -> derived/report state -> audit record -> replay/reversal behavior. Read physical stored values back where mathematical integrity depends on them.
