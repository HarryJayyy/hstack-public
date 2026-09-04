# Evidence Envelope

`hstack-evidence/v1` is the canonical machine-readable evidence shape. It includes:

- aggregate state: `PASS`, `VIOLATION`, `INCOMPLETE`, `STALE`, or `UNKNOWN`;
- generation time and evidence subject;
- repository provider, owner/project identity, remote, and detected default branch;
- exact head SHA, branch, dirty state, and optional worktree fingerprint;
- source adapters and exact deployment identity when live evidence is claimed;
- observation time, TTL, expiry, and freshness state;
- capability declarations used for the operation;
- typed findings and artifacts;
- triggers that invalidate the evidence.

Markdown summaries must be rendered from or remain traceable to this envelope. Repository status, CI, review, and deployment claims become stale when their identity or TTL changes even if their prose still reads correctly.

For cross-module business reactions, attach a validated `hstack-event-proof/v1` receipt. The generic
envelope cannot by itself establish expected-versus-implemented-versus-observed graph completeness.
