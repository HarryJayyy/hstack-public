---
name: hstack-mode
description: Coordinate HStack workflows for cross-system or operationally risky development that needs explicit controls and evidence.
---

# HStack Mode

Use HStack as a control plane around the host repository's own engineering process. Never assume that invoking this skill authorizes mutation, cleanup, merge, deployment, publication, or a business-policy choice.

## Route the work

1. Establish the applicable host rules and authority mode. Use `hstack-host-profile` when these are unknown or changed; reuse a current profile.
2. Check the target branch and dirty state before editing. Use `hstack-reconcile` for shared-worktree uncertainty, handoff, cleanup assessment, or a requested full inventory.
3. Classify the task playbook, risk band, overlays, and declared operations. Use `hstack route --text "<request>" --operations <declared-operations> --paths <changed-paths>` when the installed runtime is available. Treat this output as advisory only: it never grants execution readiness. Before mutation, require a separately supplied structured execution contract and evaluate it with `hstack execute`; do not synthesize that contract from the free-text route result.

   Revisit advisory classification when traced code, state effects or new observations contradict it. Keyword coverage is not semantic understanding. Select only relevant context and checks; classification changes never expand operations, authorization or host-policy exceptions.
4. Define the intended result, affected boundaries, and completion evidence before implementation. Use `hstack-impact` when dependency or durable-state effects need explicit tracing; keep a local change contract proportionate.
5. Apply `hstack-invariants` whenever money, inventory, lifecycle, authorization, compliance, asynchronous work, or external integrations are involved.
6. Execute only the bounded work the user authorized. Preserve unrelated and ambiguous work.
7. Bind verification to the exact final state and issue a verdict with `hstack-evidence`.

Read references only for the decision at hand:

- [composition.md](references/composition.md): how playbooks, overlays, profiles, and adapters combine.
- [playbooks.md](references/playbooks.md): selecting an unfamiliar task workflow.
- [engineering-workflows.md](references/engineering-workflows.md): practical investigation, implementation, and operational steps for the selected playbook.
- [session-recovery.md](references/session-recovery.md): pausing or resuming an interrupted task without losing decisions or repeating completed work.
- [behavioral-evaluation.md](references/behavioral-evaluation.md): evaluating changes to HStack's agent instructions, not ordinary product changes.
- [control-precedence.md](references/control-precedence.md): resolving competing controls or authorization uncertainty.
- [verdicts.md](references/verdicts.md): choosing a formal HStack closeout verdict.

Small, reversible edits do not require the entire HStack stack. Continue through implementation and the required verification within the authorized scope. Existing authorization remains valid; a skill invocation neither adds authority nor requires asking again for already-authorized work.

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
