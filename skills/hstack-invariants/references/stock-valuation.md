# Stock and Valuation Invariants

Define quantity units, warehouse, ownership, batch/serial identity, valuation method, effective/posting time, negative-stock policy, and accounting coupling.

Verify:

- stock movement and valuation entries reconcile to the source event;
- available, reserved, projected, and actual quantities follow their distinct semantics;
- serial/batch uniqueness and traceability remain intact;
- backdated entries trigger supported repost/revaluation behavior;
- concurrent reservations or receipts cannot oversell or double-consume;
- cancellation, return, transfer, and partial receipt reverse the right layers;
- ledger impact reconciles when perpetual inventory or similar coupling is enabled;
- stored quantities, rates, values, and reports agree after replay.
