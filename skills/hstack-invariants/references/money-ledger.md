# Money and Ledger Invariants

Define the accounting event before changing code: accounts, debit/credit direction, amount source, currency, exchange rate, precision, rounding, recognition/posting dates, company, dimensions, and reversal semantics.

Verify with representative and adversarial inputs:

- total debits equal total credits for each posted transaction;
- source totals reconcile to ledger entries and reports;
- taxes, discounts, allocations, commissions, and write-offs round deterministically;
- foreign-currency amounts and base amounts remain consistent;
- cancellation/amendment creates the expected audit trail and reversal;
- retry does not double-post;
- period locks and permissions hold under direct server calls;
- stored values are read back, not inferred from the request payload.
