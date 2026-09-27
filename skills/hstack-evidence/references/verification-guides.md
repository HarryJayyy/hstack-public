# Project Verification Guides

## Create

- Use when the user requests a guide or a material boundary lacks a repeatable check. Inspect existing host tests, launchers, fixture tools, and runbooks first; extend the supported harness rather than installing a competing one.
- Discover the target environment, exact launch command and working directory, readiness observation, owned fixture creation, user/API/job entry point, independent readback, negative control, and cleanup. Link each recipe to source or host documentation. Unknown behavior is an unresolved question, not an invented expected result.
- Choose a host-approved project-local destination, normally `.hstack/verification/`. Writing the guide requires edit authorization. Do not change product code, install dependencies, or access production merely to generate it.
- Describe concrete steps with `procedure`, `expected`, and `failureMeaning`. State mutation boundaries alongside them. Record fixture identity, final-state binding, invalidation triggers, and limitations for each feature. Commands must work from their declared working directory; placeholders must be resolved before execution.
- Establish consequential expected values separately from the changed implementation. In the host guide/evidence narrative, state whether each material observation is system-observed, actor-reported, provider-confirmed or inferred. These are reasoning annotations, not additional accepted JSON fields in the draft formatter.
- Supply a `hstack-verification-guide/v1` JSON input to `hstack verification-guide --input guide.json`. It emits a draft JSON document containing Markdown; `--markdown` emits only Markdown. The helper validates structure and formats supplied recipes. It does not discover the repository, write files, run commands, or verify expectations.

## Exercise

1. Review every step against the current authorization and environment identity. A procedure describing an external write is not permission to run it.
2. Execute doctor/readiness before driving the selected feature. Capture command, exit status, time, fixture identity, code/worktree binding, and artifacts outside temporary fixture cleanup.
3. Run at least one mapped feature end to end, including its negative control and independent observations. Mark only exercised features as verified for that bound state; leave the others draft. Use the evidence contract for the actual claim.
4. If blocked, preserve the draft and name the missing credential, policy, fixture, or harness. Do not replace missing observations with guessed results.
5. Clean only owned resources explicitly authorized for cleanup. Never kill an unknown process, delete shared rows, or remove evidence artifacts. Unconfirmed cleanup remains incomplete.

## Maintain

- Use when the user asks to maintain the guide, or when a changed boundary invalidates its recipe. Read only the affected feature's sources first; widen based on demonstrated dependencies.
- Separate **guide drift** (renamed route, changed launcher, obsolete fixture) from **product failure** (valid procedure exposes wrong behavior). Repair authorized guide drift; report product failures without silently changing product code.
- Return `unchanged`, `updated`, or `blocked`, the affected feature IDs, and the actual evidence state. Re-exercise changed recipes within the authorized budget; otherwise mark them draft/stale.
- Scheduled maintenance and PR creation require separate requested workflows. Maintenance is not an implicit monitor, deployment, or push.

## Input example

```json
{
  "schemaVersion": "hstack-verification-guide/v1",
  "name": "Queue processing",
  "environment": "isolated local test database",
  "workingDirectory": ".",
  "source": "host testing runbook",
  "doctor": [{"procedure": "npm run test:doctor", "expected": "local fixture database ready", "failureMeaning": "stop: test environment unavailable"}],
  "launch": [{"procedure": "npm run worker:test", "expected": "worker ready", "failureMeaning": "stop: worker did not start"}],
  "cleanup": [{"procedure": "stop the worker process started by this run", "expected": "owned process absent; logs retained", "failureMeaning": "owned process cleanup unconfirmed"}],
  "ownership": "run-specific worker PID and fixture IDs only",
  "features": [{
    "id": "delivery",
    "claim": "a repeated delivery has one durable effect",
    "fixture": "run-owned event in the local test database",
    "binding": "final worktree fingerprint, fixture ID, worker configuration and observation time",
    "drive": [{"procedure": "run the host duplicate-delivery test", "expected": "same event delivered twice", "failureMeaning": "replay was not exercised"}],
    "observe": [{"procedure": "query the event's stored effects using the host readback helper", "expected": "exactly one durable effect", "failureMeaning": "duplicate or missing effect"}],
    "negativeControl": [{"procedure": "run the host assertion-sensitivity test with a deliberately duplicated effect in an isolated fixture", "expected": "contract check rejects the duplicated effect", "failureMeaning": "check accepted an intentionally wrong effect"}],
    "invalidatesOn": ["worker code, fixture or configuration changes"],
    "limitations": ["does not establish distributed concurrency correctness"]
  }]
}
```

These are illustrative procedures, not bundled host commands. Replace them with source-backed commands before exercising the guide. Output is private host material unless separately reviewed and authorized for disclosure.
