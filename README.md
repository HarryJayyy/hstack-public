# HStack

AI agents are good at producing code. They are less reliable at preserving the full problem,
respecting repository authority, tracing distant effects, protecting concurrent work, and proving
that the final system state is correct.

HStack is a **structured problem-solving stack for development agents**. It turns a request into a
bounded engineering task with explicit rules, impact, invariants, execution authority, evidence,
and a precise final verdict.

> **HStack — Solve the whole problem. Prove the result.**

## Best-fit project types

Use HStack for software where a locally correct edit can create a distant or expensive failure:

- multi-module applications and long-lived monorepos;
- transactional and stateful business systems;
- billing, payments, accounting, and financial workflows;
- inventory, fulfillment, logistics, and resource planning;
- multi-tenant applications with role and ownership boundaries;
- approval, lifecycle, audit, retention, and compliance workflows;
- queues, workers, schedulers, webhooks, imports, and external integrations;
- database migrations, backfills, data repair, releases, and production incidents;
- shared repositories with multiple agents, branches, or worktrees.

HStack is usually unnecessary for a throwaway prototype, an isolated script, a static content edit,
or low-risk visual polish unless the host repository requires it.

## Functions

| Function | Use it when | Main result |
| --- | --- | --- |
| `$hstack-mode` | The task is non-trivial and you want HStack to choose the controls | Routed task, bounded execution, verified closeout |
| `$hstack-host-profile` | The repository is new, unfamiliar, external, or has unclear rules | Authority mode, host rules, capabilities, native checks |
| `$hstack-reconcile` | You need to understand branches, worktrees, pull requests, or dirty state | Preserve-first open-work inventory |
| `$hstack-impact` | A feature, fix, refactor, or migration may affect distant code or data | Change contract, blast radius, required proof |
| `$hstack-invariants` | Correctness depends on durable state across modules or systems | Invariants for lifecycle, money, inventory, access, async work, and reconciliation |
| `$hstack-evidence` | You need to decide whether work is actually complete or correct | Exact-state evidence and a precise verdict |

For inputs, outputs, direct invocation examples, playbooks, overlays, and CLI commands, read the
[HStack Manual](docs/MANUAL.md).

## Quick use

Start a complete non-trivial task:

```text
Use $hstack-mode to fix duplicate processing in the background worker. Reproduce it, map the retry
and concurrency paths, preserve unrelated work, and prove the final behavior.
```

Invoke a focused function directly:

```text
Use $hstack-impact to map what this schema change could break. Do not edit files.
```

```text
Use $hstack-reconcile to inventory open work and identify what must be preserved. Do not clean.
```

```text
Use $hstack-evidence to decide whether this change is ready to merge. Bind every claim to the exact
head SHA and report missing or stale proof.
```

## How HStack solves a task

```text
request
  -> discover host rules and authority
  -> reconcile existing work
  -> classify playbook and risk
  -> define the change contract
  -> map blast radius and invariants
  -> execute only authorized scope
  -> verify focused, adjacent, and runtime behavior
  -> bind evidence to exact state
  -> issue PASS, VIOLATION, INCOMPLETE, STALE, or UNKNOWN
```

HStack composes controls instead of creating one mode for every problem:

```text
task playbook x risk overlays x host profile x verification adapters
```

Examples:

- a race-condition fix composes `bug-fix x async-concurrency x retry-concurrency-proof`;
- a data repair composes `data-migration x authorization x migration-rehearsal-readback`;
- an invoice correction composes `bug-fix x money-ledger x ledger-reconcile`;
- a dashboard change composes `feature x ui-browser x browser-journey`.

## Authority modes

| Mode | Meaning |
| --- | --- |
| `canonical` | The repository owner has explicitly adopted HStack as its official control workflow. |
| `overlay` | The host process remains authoritative; HStack adds compatible safety and evidence. |
| `advisory` | HStack investigates and reports without mutation authority. |

Invoking HStack never grants permission to edit, push, merge, deploy, delete, or disclose. Those
capabilities are declared by the profile and authorized separately for the current task.

## Evidence states

| State | Exit | Meaning |
| --- | ---: | --- |
| `PASS` | 0 | The declared evidence contract is satisfied for the bound state. |
| `VIOLATION` | 2 | A known rule, invariant, or required check failed. |
| `INCOMPLETE` | 3 | Required evidence, authority, review, or adapter output is missing. |
| `STALE` | 4 | Evidence exists but no longer matches its freshness contract. |
| `UNKNOWN` | 5 | Relevant state could not be classified safely. |

A completed failed CI check is `VIOLATION`, not “pending.”

- A diagram is navigation, not runtime proof.
- An API or HTTP 200 response is insufficient without downstream observations.
- A test filename proves existence, not execution on the bound SHA and environment.
- A build proves construction, not business behavior.

## Cross-module event proof

Use `hstack-event-proof/v1` when one event must cause or forbid reactions in multiple modules or
stores. It separates:

1. the policy-owned expected graph;
2. the source-backed implementation graph;
3. the artifact-backed observed graph.

The receipt validator checks required mappings, dependencies, cardinality, readbacks, scenarios,
negative-control binding, cleanup disposition, and declared state consistency. Runtime adapters and
host tests remain responsible for producing trustworthy artifacts. See [Cross-Module Event
Proof](skills/hstack-evidence/references/event-proof.md).

## Command-line tools

```powershell
hstack route --text "fix duplicate worker processing" --operations modify-repository --authorized edit
Get-Content execution-task.json | hstack execute
hstack inventory --repo C:/path/to/repository --profile C:/path/to/profile.json
hstack fingerprint --repo C:/path/to/repository
hstack redact --input handoff.json --sensitive-values sensitive-values.json
Get-Content checks.json | hstack status
Get-Content receipt.json | hstack verify-event
```

Inside an installed skill, the agent resolves the plugin root from `SKILL.md` and executes
`node <plugin-root>/bin/hstack.mjs`; it does not rely on the target repository's `npm` scripts.

`route` is advisory classification only and never returns execution readiness. Only `execute` can
return `executionReady`, and it accepts a separate structured contract with no free-text request.

Build the lean installation artifact from the source repository with `npm run package:plugin`.
The output is `dist/hstack`. It contains the manifest, six skills, runtime, schemas, profiles,
manual, and license while excluding tests, CI, internal instructions, and design-history files.

## Agent and editor support

HStack separates its portable control model from tool-specific packaging:

- **Codex:** the repository ships and validates a native Codex plugin manifest, skill metadata, and
  lean installation artifact.
- **Claude Code and Cursor:** the Markdown skills and dependency-free Node.js CLI can be adapted to
  environments that support custom instructions and shell commands, but this release does not ship
  native installers or claim tested compatibility for them.

Claude Code and Cursor testing is not part of HStack's release gate. Describe those integrations as
manual and unverified until a platform-specific adapter and test contract are added. HStack is
therefore portable at its core, but it is not currently a universal one-click plugin.

Repository-specific settings belong in the target repository's `.hstack.json`. Bundled profiles are
starting points, not substitutes for discovering real host rules. See [Profile
Reference](docs/PROFILE.md) and [Architecture](docs/ARCHITECTURE.md).

## Design principles

1. Authority before autonomy.
2. Problem before implementation.
3. Invariants before files.
4. Evidence before verdict.
5. Preserve before cleanup.
6. Composition before mode proliferation.

## License and source boundary

HStack is open source under the [MIT License](LICENSE). It contains no copied host-project process or
source. Host rules, business policies, secrets, and repository-specific profiles stay in the host
repository rather than the portable HStack package. Installing HStack does not change a host
repository's license or grant permission to disclose that repository.
