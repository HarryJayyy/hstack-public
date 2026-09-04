# Control Precedence

Apply controls in this order:

```text
law and ownership boundaries
-> explicit user authorization
-> host repository mandatory rules
-> HStack safety floor
-> project profile
-> task-specific execution budget
```

Every lower layer may narrow behavior but may not grant authority denied or absent above it. User authorization is necessary for consequential mutations but does not waive law, ownership, host protections, or HStack's preservation/evidence floor. When mandatory host behavior and an HStack mechanism conflict, preserve the host convention and meet HStack's safety outcome through a compatible mechanism or stop.

Examples:

- A profile can declare `deploy` available, but deployment still needs explicit user authority and must follow the host release process.
- A task budget can forbid pushing even when the project profile permits it.
- HStack can require stronger readback evidence for a host-governed patch, but cannot replace the host's supported migration or test mechanism.
