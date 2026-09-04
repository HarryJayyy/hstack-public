# Authority Modes

## Canonical

Use only when the repository owner has adopted HStack. HStack defines the default change-control vocabulary and closeout contract. Repository-specific settings still override generic defaults where they are stricter or more precise.

## Overlay

Use for external or established projects. The effective process is:

```text
host mandatory rules + HStack controls that do not conflict
```

Never substitute HStack commands for host-supported test, migration, build, or release commands without evidence of equivalence.

## Advisory

Use for audits, reviews, explanations, or when mutation authority is absent. Read-only diagnostics are allowed. Any proposed patch, cleanup, merge, deployment, or external write requires new authorization.
