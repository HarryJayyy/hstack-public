# Security

Do not open a public issue containing vulnerability details, credentials, private repository data,
or user source code. Report security concerns privately through GitHub's private vulnerability
reporting for this repository, or contact the repository owner directly if that channel is
unavailable.

The inventory and fingerprint commands are read-only by design. A change that adds network mutation, cleanup, merge, deployment, secret reading, or untracked-file content collection requires explicit owner review and new tests.

Public output must first pass through a schema-owned allowlist projector. General handoff redaction
also requires caller-supplied sensitive values and is defense in depth rather than public-safety
certification or permission to disclose. Do not log original secret-bearing input during redaction.
