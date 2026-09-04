---
name: hstack-evidence
description: Design and evaluate multi-layer verification, bind results to exact code and environment state, and issue precise PASS, correction, blocked, parked, or unverified verdicts. Use before claiming a complex change is complete, safe, mergeable, deployed, or correct.
---

# HStack Evidence

Verification must test the invariant, not merely the implementation's ability to compile.

## Evidence contract

Before execution, define the claim, risk, proving observation, command or procedure, environment, fixture, expected result, failure meaning, state binding, and freshness window. Use [evidence-contract.md](references/evidence-contract.md). For durable output, use [evidence-envelope.md](references/evidence-envelope.md). When one event crosses module boundaries, use [event-proof.md](references/event-proof.md).

## Verification sequence

1. Capture a pre-change failure or baseline where feasible.
2. Run focused deterministic checks for the changed behavior.
3. Run domain adapters selected by the router: ledger reconciliation, stock replay/readback, migration rehearsal, permission matrix, retry/concurrency proof, contract replay, browser journey, or post-deploy watch.
4. Run host-required adjacent and aggregate gates proportionate to risk.
5. Inspect the final diff and rerun checks invalidated by later edits.
6. Bind results to repository path, commit or worktree fingerprint, profile, environment, data/fixture version, and time.
7. Reconcile PR/check status against the exact head SHA when making merge-readiness claims.
8. Issue a verdict using [closeout.md](references/closeout.md).

Run `hstack fingerprint --repo <path>` when the installed runtime is available. Use `hstack status`
for a structured CI/review verdict and `hstack verify-event` for an event-proof receipt. The
fingerprint is an identity aid, not a correctness proof.

## Evidence standards

- Passing build, lint, type-check, or happy-path UI does not prove financial, stock, authorization, migration, or retry correctness.
- A diagram is navigation, an API 200 is only transport evidence, a test filename proves existence rather than execution, and a build does not prove business behavior.
- A wrapper timeout is not automatically a test failure if a child process remains active; observe and report the actual process state.
- Historical logs and generated status documents are claims unless they are verified against current code, workflow state, or live behavior.
- Never rerun unchanged destructive or rate-limited live tests merely to obtain a green-looking result.
- Completed failed CI is `VIOLATION`, not incomplete. Preserve separate correction, investigation, and review-policy components.

## Installed runtime

Resolve the HStack plugin root from this `SKILL.md` location by moving up two directories, then run
`node <plugin-root>/bin/hstack.mjs <command>`. Do not run a same-named `npm` script in the host
repository as a substitute. Runtime validation checks supplied evidence; it does not create missing
business or runtime proof.
