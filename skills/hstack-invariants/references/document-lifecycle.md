# Lifecycle Invariants

Map allowed states and transitions, including draft, approved/submitted, cancelled/voided, amended, rejected, and archived where applicable.

Verify:

- authorization and preconditions at the server boundary;
- transition atomicity with dependent entries;
- immutability rules after finalization;
- auditable cancellation and amendment linkage;
- duplicate submission, retry, stale client, and concurrent transition behavior;
- downstream notifications, ledgers, stock, reports, and integrations;
- recovery from partial failure.
