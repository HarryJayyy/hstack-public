# HStack Manual

This manual lists each HStack function, when to invoke it, what information it needs, what it does,
and what it returns. Start with `$hstack-mode` unless you already know which focused function you
need.

## Function selector

| Your question | Function |
| --- | --- |
| “Handle this non-trivial task from start to finish.” | `$hstack-mode` |
| “Which rules control this repository?” | `$hstack-host-profile` |
| “What work already exists, and what must not be lost?” | `$hstack-reconcile` |
| “What else could this change affect?” | `$hstack-impact` |
| “Which durable truths must remain correct?” | `$hstack-invariants` |
| “Can we honestly claim this is complete or correct?” | `$hstack-evidence` |
| “Create or maintain runnable checks for this project.” | `$hstack-evidence` — verification guides |
| “Resume this task without restarting it.” | `$hstack-mode` — session recovery |
| “Compare designs before implementing a costly boundary.” | `$hstack-impact` — design quality |
| “Evaluate whether these HStack instructions help agents.” | `$hstack-mode` — behavioral evaluation |

## 1. `$hstack-mode`

### Purpose

- Main entry point for a complete development task.
- Chooses the task playbook, risk overlays, focused functions, and verification depth.
- Keeps the agent inside the authorized scope from investigation through closeout.

### Use when

- implementing a non-trivial feature;
- fixing a bug with uncertain blast radius;
- refactoring behavior across files or modules;
- changing schemas or durable data;
- investigating a production or integration problem;
- preparing a high-confidence release or handoff.

### Do not use when

- the request is a trivial content edit;
- the user asked only for a narrow read-only fact that needs no workflow;
- the host repository already provides a smaller mandatory procedure that fully covers the task.

### Request format

Provide:

- the desired outcome;
- known symptoms or constraints;
- whether mutation is authorized;
- any explicit execution or rerun budget;
- any live, production, irreversible, or disclosure boundary.

Example:

```text
Use $hstack-mode to fix duplicate job delivery. You may edit and test locally, but do not deploy or
merge. Stop with evidence if the retry policy is undefined.
```

### What it does

1. Loads the host profile.
2. Reconciles open work.
3. Routes the task to a playbook and overlays.
4. Creates a change contract and impact map when code may change.
5. Applies invariant controls for durable or cross-system state.
6. Executes only authorized work.
7. Collects exact-state evidence and issues a verdict.

### Output

- playbook and risk band;
- authority and capability decision;
- selected overlays and verification adapters;
- completed change or bounded investigation;
- final evidence state and unresolved items.

### Stop conditions

- missing business, legal, lifecycle, or authorization policy;
- denied or absent capability;
- unknown concurrent work that makes mutation unsafe;
- unavailable required environment or evidence;
- exhausted explicit task budget.

## 2. `$hstack-host-profile`

### Purpose

- Discovers which rules and tools govern a repository.
- Selects `canonical`, `overlay`, or `advisory` authority.
- Prevents HStack from replacing or weakening host requirements.

### Use when

- entering a repository for the first time;
- repository instructions conflict or appear incomplete;
- working in a repository governed by another team or framework;
- adding or updating `.hstack.json`;
- deciding which tests, deployment identities, or protected branches matter.

### Request format

```text
Use $hstack-host-profile to inspect this repository and report its authority mode, mandatory rules,
protected boundaries, available capabilities, native verification commands, and unresolved policy.
Do not edit anything.
```

### Inputs

- repository root;
- local instruction files and contribution guides;
- architecture, testing, and release documentation;
- repository provider and remotes;
- existing `.hstack.json`, if present;
- current user authorization.

### Output

- authority mode;
- rule precedence;
- source and disclosure boundary;
- capability policy;
- concurrency limits;
- risk-sensitive paths;
- native verification commands;
- repository, CI, framework, and deployment adapters;
- evidence TTL and invalidation triggers.

### Important rule

A capability declaration says what the environment can potentially do. It does not authorize the
current task to do it.

## 3. `$hstack-reconcile`

### Purpose

- Produces a read-only inventory of existing work.
- Prevents agents from overwriting, deleting, or misclassifying concurrent changes.
- Creates reliable start, handoff, and closeout state.

### Use when

- beginning or ending non-trivial work;
- multiple branches, worktrees, or agents may be active;
- a branch or pull request appears stale;
- cleanup is being considered;
- a handoff needs exact repository state.

### Request format

```text
Use $hstack-reconcile to inventory branches, worktrees, dirty state, remotes, and open changes.
Classify uncertainty preserve-first. Do not fetch, clean, delete, merge, or push.
```

### What it checks

- current repository, branch, and exact HEAD;
- dirty and untracked state;
- attached and inaccessible worktrees;
- local and remote-tracking branches;
- configured base and protected branches;
- pull or merge request correlation using source identity and exact SHA;
- fetch time and evidence freshness;
- ownership, reachability, and ambiguity.

### Output categories

- active and preserve;
- dirty or untracked and preserve;
- attached and preserve;
- unmerged and preserve;
- mismatched or unknown and preserve;
- verified cleanup candidate;
- protected base branch.

### Important rule

Inventory is never cleanup. Deletion requires separate explicit authorization for exact targets.

### CLI

```powershell
hstack inventory --repo C:/path/to/repository --profile C:/path/to/profile.json
```

## 4. `$hstack-impact`

### Purpose

- Converts the request into a change contract.
- Traces blast radius across code, data, events, jobs, integrations, permissions, reports, and
  operations before editing.

### Use when

- changing behavior across a function or module boundary;
- a small-looking edit could affect distant consumers;
- modifying a schema, data model, state transition, API, queue, or integration;
- fixing a bug without a proven root cause;
- planning a refactor or migration.

### Request format

```text
Use $hstack-impact to map this change before implementation. Identify entry points, reads, writes,
transactions, async consumers, permissions, reports, failure paths, adjacent regressions, and proof
required at each boundary.
```

### Inputs

- requested behavior and excluded scope;
- actors and entry points;
- likely changed paths;
- data and state transitions;
- known business or system policies;
- failure, retry, rollback, and recovery expectations.

### Output

- problem statement and success criteria;
- change contract;
- dependency and reaction map;
- transaction boundaries and gaps;
- risk overlays;
- adjacent regression list;
- required verification and readbacks;
- explicit unknowns and policy blockers.

### Important rule

No static importer does not prove code is unused. Check dynamic dispatch, framework conventions,
configuration, jobs, hooks, raw queries, and external callers.

## 5. `$hstack-invariants`

### Purpose

- Protects durable truths that span modules, records, processes, or external systems.
- Converts broad correctness claims into explicit invariants and readback obligations.

### Use when a task affects

- money, balances, invoices, payments, tax, currency, or rounding;
- inventory quantities, ownership, costing, warehouses, batches, or serial identity;
- submit, approve, cancel, reverse, amend, release, archive, or retention behavior;
- roles, tenants, ownership, branch scope, or privileged operations;
- queues, retries, concurrency, ordering, idempotency, or dead-letter handling;
- imports, exports, webhooks, synchronization, or external systems;
- procurement, fulfillment, reconciliation, or auditable business state.

### Request format

```text
Use $hstack-invariants to identify the durable truths affected by this change. Define lifecycle,
authorization, transaction, retry, reversal, and reconciliation obligations. Stop rather than
inventing undefined policy.
```

### Overlay functions

| Overlay | Use for | Required proof examples |
| --- | --- | --- |
| `money-ledger` | financial state | balanced entries, rounding, reversal, reconciliation |
| `stock-valuation` | inventory state | quantity, ownership, costing, backdating, ledger coupling |
| `document-lifecycle` | state transitions | allowed transitions, finality, cancellation, amendment |
| `authorization` | access boundaries | allowed actor, denied actor, wrong tenant, privilege path |
| `regional-compliance` | jurisdiction rules | authoritative source, effective date, document version |
| `async-concurrency` | jobs and races | replay, duplicate, ordering, retry, partial failure |
| `integration-contract` | external boundaries | contract version, request/response, timeout, reconciliation |
| `data-migration` | schema and data changes | rehearsal, counts, values, idempotency, recovery |

### Output

- named invariants;
- authoritative policy references;
- expected reactions and forbidden effects;
- transaction and consistency model;
- required negative, retry, concurrency, and reversal scenarios;
- durable readbacks and reconciliation checks.

### Stop condition

Undefined consequential policy returns `BLOCKED BUSINESS DECISION`. The agent must not choose the
financial, legal, lifecycle, or authorization rule itself.

## 6. `$hstack-evidence`

### Purpose

- Designs verification before execution.
- Binds results to the exact repository and runtime state.
- Prevents proxy evidence from being reported as business correctness.

### Use when

- defining the test plan for a complex change;
- reviewing whether a branch or pull request is ready;
- validating a migration, release, deployment, or incident correction;
- deciding whether evidence is missing, stale, contradictory, or unknown;
- producing a durable handoff or closeout verdict.

### Request format

```text
Use $hstack-evidence to verify this change. Define the claim and proving observation, run the
authorized checks, bind results to exact code and environment state, and return the narrowest
accurate verdict. Do not treat build success as runtime proof.
```

### Evidence layers

1. Static structure and configuration.
2. Focused deterministic behavior.
3. Adjacent regression behavior.
4. Integration and persistence.
5. Authorization and isolation.
6. Retry, concurrency, failure, and recovery.
7. Deployment and live observation when required.

### Output

- claim and evidence contract;
- exact repository SHA or worktree fingerprint;
- environment, deployment, fixture, flags, and observation time;
- commands and procedures actually executed;
- artifacts and readbacks;
- limitations and invalidation triggers;
- `PASS`, `VIOLATION`, `INCOMPLETE`, `STALE`, or `UNKNOWN`;
- separate human correction, investigation, or policy blockers where needed.

### Cross-module event proof

Use `hstack-event-proof/v1` when one event has required or forbidden reactions across modules or
stores. The receipt contains expected, implemented, and observed graphs plus scenario, readback,
negative-control, artifact, and cleanup evidence. The semantic API is:

```powershell
Get-Content receipt.json | hstack verify-event
```

The receipt validator checks supplied evidence consistency. Host adapters and test procedures must
produce and verify the underlying artifacts.

## Task playbooks

### Conditional reasoning controls

- **Gap discovery (`$hstack-impact`):** select only questions relevant to traced access, retry identity, lifecycle, downstream consumers and partial effects. Inspect existing answers before asking the owner.
- **Requirement provenance (`$hstack-impact`):** reuse host records for source, interpretation, applicability and approval. Keep approval, implementation and verification statuses separate; unresolved consequential decisions block dependent behavior only.
- **Independent expectations (`$hstack-evidence`):** use approved examples, separate calculations or source-backed references rather than the implementation's own answer.
- **Observation classification (`$hstack-evidence`):** distinguish system-observed, actor-reported, provider-confirmed and inferred facts. Verify record handling without claiming an unobserved physical action occurred.
- **Adaptive checks (`$hstack-evidence`):** name the uncertainty each check resolves, preserve mandatory host gates, refresh invalidated evidence, and stop unchanged failing/unavailable loops within budget.
- **Advisory reclassification (`$hstack-mode`):** revise selected controls when actual code/state contradicts keyword routing; never expand execution authority through classification.

These are conditional agent procedures, not a requirement compiler, automatic graph integration,
new receipt trust levels, or machine enforcement of business approval. They do not require more top-level skills.

```text
Use $hstack-impact to discover missing acceptance behavior for this state change. Reuse approved
host requirements, inspect existing answers, and ask only consequential decisions that remain unresolved.
```

```text
Use $hstack-evidence to choose the next discriminating check. Separate test-harness failure from
product failure, retain prior results, and do not repeat unchanged unavailable checks.
```

| Playbook | Use when | Core method |
| --- | --- | --- |
| `investigation` | explain, audit, review, trace | facts, hypotheses, evidence, no implied mutation |
| `bug-fix` | behavior is wrong | reproduce, root cause, regression, fix, re-verify |
| `feature` | behavior is added or changed | success criteria, design, implement, verify |
| `refactor` | structure changes but behavior should not | baseline behavior, migrate, remove old path, compare |
| `data-migration` | schema or persisted data changes | rehearse, count, read back, retry, recover |
| `integration` | a system boundary changes | contract, replay, timeout, idempotency, reconciliation |
| `performance-forensics` | measured behavior is slow | baseline, trace, hypothesis, change, compare |
| `production-incident` | live state is degraded | stabilize, preserve evidence, recover, verify, learn |
| `upgrade-backport` | versions or compatibility change | compatibility matrix, migration, rollback, verification |
| `release-verification` | a release claim needs proof | artifact identity, environment, live behavior, watch |

## CLI reference

### Create or maintain a verification guide

- Function: `$hstack-evidence`.
- Input: target feature, existing host harness, environment and authorized operations.
- Method: discover source-backed doctor, launch, drive, readback, negative-control and owned-cleanup procedures; format a draft and exercise selected features within scope.
- Output: a project-local guide plus separate actual execution evidence. Unexercised features remain draft.
- Maintenance: distinguish obsolete recipes from product failures; repair only authorized guide drift and rerun invalidated checks.

```text
Use $hstack-evidence to create a local verification guide for worker retries. Reuse our existing
test harness. You may edit the guide and run local checks, but do not deploy or use production data.
```

```powershell
hstack verification-guide --input guide.json
hstack verification-guide --input guide.json --markdown
```

The input contract and example are in [Verification Guides](../skills/hstack-evidence/references/verification-guides.md).
The CLI emits to stdout only. Exit 0 means successful draft formatting, not verified business correctness.
It never writes the guide, executes supplied procedures, or grants authority. Do not publish raw host guides without disclosure review.

### Resume or pause a task

- Function: `$hstack-mode`.
- Input: prior capsule or scoped task trail and current authorization.
- Output: inherited decisions, completed/pending criteria, current state, still-valid evidence and one resume action.
- Refresh only invalidated evidence. A pause does not imply permission to stash, commit, push or clean.

```text
Use $hstack-mode to resume from this handoff. Check current state, reuse completed work and valid
evidence, then finish the remaining local checks. Do not push, merge or deploy.
```

See [Session Recovery](../skills/hstack-mode/references/session-recovery.md).

### Design-quality checkpoint

- Function: `$hstack-impact`.
- Input: intended caller behavior, existing boundaries and non-trivial design constraints.
- Output: interface sketch, material alternatives, trade-offs, test seams and redesign signals.
- Use a compact review for a local change; do not force competing architectures for an obvious fix.

```text
Use $hstack-impact to compare designs for this new integration boundary. Show caller usage, state
ownership, failure semantics and test seams. Do not implement yet.
```

See [Design Quality](../skills/hstack-impact/references/design-quality.md).

### Evaluate HStack's agent behavior (source repository only)

```powershell
npm run eval:skills
npm run eval:skills -- --prepare duplicate-delivery
npm run eval:skills -- --input observations.json --artifact-root C:/path/to/owned-artifacts
```

- No observations: `NOT_RUN`, exit 3.
- Preparation: creates an owned temporary candidate workspace; does not launch an agent or execute fixtures.
- Scoring: consumes independent reviewer annotations with hash-bound artifact citations. Complete annotations are `SCORED`; missing cases or unassessed criteria are `INCOMPLETE`.
- Failed criteria exit 2 even when scoring is complete. A scored comparison is not a business-release verdict or proof of superior speed.
- Keep rubric and observations away from candidate context. Compare like-for-like runs; preserve critical failures, time and tool counts separately.

See [Behavioral Evaluation](../skills/hstack-mode/references/behavioral-evaluation.md) for the observation contract.
The source fixtures and scorer are excluded from the lean plugin package. Live agent runs and native
Claude Code/Cursor tests have not been performed by adding this suite.

`hstack` is shorthand for the installed entry point. Agents resolve the active skill's `SKILL.md`,
move up two directories to the plugin root, and run `node <plugin-root>/bin/hstack.mjs`. This avoids
accidentally invoking a same-named script in the target repository.

### Classify a task

```powershell
hstack route --text "fix duplicate worker processing" --operations modify-repository --authorized edit
```

Task JSON and the CLI accept an `operations` array. `inspect` derives `read`; mutation operations
derive `edit`, `push`, `merge`, `deploy`, `delete`, or `public-disclose`. Every derived mutation
capability must appear in `authorizedCapabilities`. `operations` are the only positive declared
operation contract; free text never proves whether a task is read-only or mutating.

`hstack route` is deliberately advisory. It reports `classificationReady` and
`declaredOperationsReady`, but never includes `executionReady`. This remains true even when the text
and declared operations appear consistent. A hash can show that text did not change, but it cannot
prove that the text was classified correctly.

Execution uses a separate structured contract with no free-text request:

```json
{
  "operations": ["modify-repository"],
  "authorizedCapabilities": ["edit"],
  "activeChanges": { "owner": 0, "worktree": 0, "lane": 0 },
  "sourceRequestDigest": "<optional-sha256-for-traceability-only>"
}
```

Evaluate it with:

```powershell
Get-Content execution-task.json | hstack execute
```

Only this structured evaluator can return `executionReady`. It rejects `request`, `intent`,
`classificationBinding`, and other unsupported fields. `sourceRequestDigest` is optional audit
traceability and has no authority effect. Mutation operations still require their derived
capabilities in `authorizedCapabilities`; a profile declaring a capability `allowed` is not current
task authorization. The controlling user or caller must supply the execution contract separately;
the free-text router must not synthesize or approve it.

### Inventory open work

```powershell
hstack inventory --repo C:/path/to/repository --profile C:/path/to/profile.json
```

The command is read-only. It does not fetch or clean.

Add `--public` to emit an aggregate-only allowlisted summary. It omits repository identity, refs,
paths, change titles and URLs, profile source, raw errors, SHAs, and fingerprints.

### Fingerprint exact local state

```powershell
hstack fingerprint --repo C:/path/to/repository
```

Use the fingerprint when uncommitted tracked or untracked metadata must be distinguished from HEAD.
With `--public`, HStack emits only state, time, dirty/untracked counts, freshness, and finding codes;
repository identity, refs, paths, SHAs, and the fingerprint digest are omitted.

### Redact a handoff

```powershell
hstack redact --input handoff.json --sensitive-values sensitive-values.json
```

The sensitive-values file is a non-empty JSON array of caller-known secret strings and should be
protected like any other secret-bearing local file. General redaction removes recognized patterns,
known sensitive values, ambiguous credential containers, and private absolute paths. It is
defense-in-depth for an approved handoff shape, not certification that arbitrary JSON or text is safe
to publish. Public output needs a schema-owned allowlist projector; disclosure still requires
separate authorization.

### Validate HStack itself

```powershell
npm test
npm run validate
npm run package:plugin
```

### Evaluate CI and review status

```powershell
Get-Content checks.json | hstack status
```

Input is a JSON object with `checks`, `approvalRequired`, and `approved`. Output preserves correction,
investigation, review-policy, and CI lifecycle as separate components.

### Validate a cross-module event receipt

```powershell
Get-Content receipt.json | hstack verify-event
```

The command validates both the receipt schema and semantic proof relationships and exits with the
derived HStack state code.

## Verdict reference

| Verdict | Meaning | Next action |
| --- | --- | --- |
| `PASS` | Required proof is satisfied for the bound state | proceed only within remaining authorization |
| `VIOLATION` | A known control or invariant failed | correct and re-verify |
| `INCOMPLETE` | Required proof or authority is missing | obtain the missing evidence or decision |
| `STALE` | Evidence no longer satisfies freshness | refresh only the invalidated checks |
| `UNKNOWN` | State cannot be classified safely | investigate; do not assume success |
| `BLOCKED BUSINESS DECISION` | Consequential policy is undefined | obtain an owner or authority decision |
| `BLOCKED AUTHORIZATION` | Required capability is not authorized | request explicit authority |
| `BLOCKED EXTERNAL` | A required service, credential, review, or environment is unavailable | resolve the external blocker |

## Common mistakes

- Running every HStack function for a trivial edit.
- Treating a profile capability as current authorization.
- Treating a successful build or API response as durable-state proof.
- Writing expected behavior from current code instead of authoritative policy.
- Cleaning branches or fixtures during a read-only inventory.
- Reusing evidence after code, deployment, environment, fixture, or flags changed.
- Hiding missing proof inside a broad “tests passed” statement.
