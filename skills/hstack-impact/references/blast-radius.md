# Blast-Radius Checklist

Check all relevant layers:

- interface, validation, accessibility, locale, print/export;
- controllers, services, domain models, hooks, middleware, permissions;
- database schema, constraints, indexes, policies, triggers, raw SQL/RPC;
- ledger and stock entries, derived balances, reports, reconciliation;
- queues, workers, schedulers, retries, locks, idempotency keys, outbox;
- imports, exports, APIs, webhooks, third-party contracts;
- audit logs, monitoring, alerts, feature flags, rollout and rollback;
- tests, fixtures, generated types, documentation, operational runbooks.

Search beyond imports when the framework supports route conventions, metadata, reflection, hooks, configuration, or database-driven dispatch.
