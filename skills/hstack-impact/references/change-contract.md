# Change Contract

Record:

- requested outcome and explicit non-goals;
- actors, roles, tenants, branches, companies, and jurisdictions;
- entry routes, commands, jobs, hooks, and user journeys;
- durable data read and written;
- business events emitted or consumed;
- money, quantity, currency, precision, rounding, time-zone, and date semantics;
- lifecycle transitions and reversals;
- authorization and ownership invariants;
- integration contracts and retry/idempotency behavior;
- migration, compatibility, and recovery expectations;
- observability, audit trail, and operator controls;
- automated and manual acceptance evidence;
- unresolved business decisions.

Label every field `defined`, `not applicable`, or `unknown`. Unknown is never silently equivalent to not applicable.

## Requirement provenance (only where consequential)

Reuse a host requirement or decision record instead of making a duplicate. For behavior governed by policy, disputed intent, or an external specification, record:

- stable requirement ID when the host uses one, statement, and source location/revision;
- interpretation and applicability (actor, company, jurisdiction or version only where relevant);
- approval status and the actual approving decision/source; an agent's proposal is not owner approval;
- effective date/version where time changes the rule;
- implementation mapping and verification status, separately from approval;
- unresolved conflicts and which acceptance criteria depend on them.

A compact host-native record is enough:

```text
Rule: repeated delivery creates one effect
Source/decision: approved retry policy, revision 2
Applicability: same event identity, local and queued entry points
Approval: approved by referenced owner decision
Implementation: worker entry point and persistent uniqueness boundary
Verification: not run for this change
```

Maintain semantics and references; tooling should generate state fingerprints. Do not manually duplicate hashes across a new paperwork system. Changed semantics invalidate dependent expectations; unrelated approved decisions remain reusable. Unknown consequential policy blocks only dependent execution, not unrelated authorized investigation or reversible preparation.
