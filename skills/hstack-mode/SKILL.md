---
name: hstack-mode
description: Route and control non-trivial agent development work from problem classification through verified closeout. Use when a task spans files or systems, changes durable state, carries operational risk, or needs a defensible result rather than code generation alone.
---

# HStack Mode

Use HStack as a control plane around the host repository's own engineering process. Never assume that invoking this skill authorizes mutation, cleanup, merge, deployment, publication, or a business-policy choice.

## Operating sequence

1. Establish the host profile and authority mode with `hstack-host-profile`.
2. Reconcile branch, PR, worktree, and dirty-state facts with `hstack-reconcile` before changing files.
3. Classify the task playbook, risk band, overlays, and declared operations. Use `hstack route --text "<request>" --operations <declared-operations> --paths <changed-paths>` when the installed runtime is available. Treat this output as advisory only: it never grants execution readiness. Before mutation, require a separately supplied structured execution contract and evaluate it with `hstack execute`; do not synthesize that contract from the free-text route result.
4. For a change, write a change contract and map the blast radius with `hstack-impact` before implementation.
5. Apply `hstack-invariants` whenever money, inventory, lifecycle, authorization, compliance, asynchronous work, or external integrations are involved.
6. Execute only the bounded work the user authorized. Preserve unrelated and ambiguous work.
7. Bind verification to the exact final state and issue a verdict with `hstack-evidence`.

For the composition model and playbook definitions, read [composition.md](references/composition.md) and [playbooks.md](references/playbooks.md). Resolve controls using [control-precedence.md](references/control-precedence.md). Read [verdicts.md](references/verdicts.md) before final closeout.

## Invariants

- Evidence precedes claims. A passing build is one signal, not proof of business correctness.
- Host rules and HStack controls combine by intersection: obey both; never use HStack to weaken the host.
- Capability declarations describe what a profile can potentially do; they never substitute for explicit authorization.
- Undefined business behavior is `BLOCKED BUSINESS DECISION`; do not invent accounting, tax, authorization, retention, or lifecycle policy.
- Separate verified defect, plausible mechanism, proven root cause, historical evidence, and current unverified state.
- Preserve ambiguous branches, worktrees, records, and migrations until ownership and reachability are established.
- Do not report `PASS` while required evidence is pending, stale, or bound to a different commit or environment.

## Scope control

If a discovered problem is outside the requested change, record it with evidence and leave it unchanged unless it blocks safe completion. If it blocks completion, stop with the narrowest accurate verdict and next decision required.

## Installed runtime

Resolve the HStack plugin root from this `SKILL.md` location by moving up two directories, then run
`node <plugin-root>/bin/hstack.mjs <command>`. Do not run a same-named `npm` script in the host
repository as a substitute. The human-facing shorthand `hstack <command>` refers to this entry point.
