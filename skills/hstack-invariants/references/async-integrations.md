# Async and Integration Invariants

Define ownership of truth, contract version, idempotency key, ordering requirements, retry policy, timeout, dead-letter/reconciliation path, and operator visibility.

Test success, validation failure, remote failure before and after acceptance, timeout with unknown outcome, duplicate delivery, out-of-order delivery, concurrent execution, replay, and permanent rejection. Prove that a retry cannot duplicate ledger, stock, invoice, or payment effects. Keep external business systems separately deployed across a documented API boundary unless the owner explicitly authorizes a different architecture and licensing review.
