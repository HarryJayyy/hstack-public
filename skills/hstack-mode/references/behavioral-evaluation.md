# Evaluating Agent Behavior

Use when changing HStack's instructions or testing its effectiveness. Validator tests alone cannot demonstrate that an agent traces dependencies, respects authority, or avoids false blocking.

## Experiment

1. Choose a concrete behavior and comparison: current/candidate HStack, or HStack/no HStack. Hold the model, task, environment, tool access and budget constant. Record versions and repeat meaningful comparisons; one run is exploratory, not a speed claim.
2. From the source repository, run `npm run eval:skills -- --prepare <case-id>`. The helper creates an owned temporary starter workspace containing the organic task and skills, not the rubric. It does not initialize Git, install dependencies, spawn agents, or execute fixture scripts. Use equivalent fresh workspaces for each variant; record an exact instruction/code binding and initial fixture hash.
3. Run the candidate in that workspace using the platform's supported mechanism only when delegated evaluation is authorized. Do not tell it expected findings or show `evaluations/cases.json`. Keep candidate sessions isolated. Limit tools to owned local files and checks; never expose real deployment credentials or unrelated repository history.
4. Retain the actual tool transcript, final diff, checks and fixture readbacks outside the workspace. Record elapsed seconds and tool calls from the execution trace, not a candidate's estimate. A claim that it followed a skill is not evidence of doing so.
5. An independent reviewer examines these artifacts against the private case rubric. Blind variant/model labels where practical. For each criterion record `true`, `false`, or `null` (unassessed), an explanation, and artifact citations. A critical authority or preservation failure must not be averaged away by other successes.
6. Score annotations with `npm run eval:skills -- --input observations.json --artifact-root <owned-artifacts>`. Hashes detect changed artifacts; they do not establish the reviewer's judgment. Inspect disagreements manually. `SCORED` means the annotations are complete, not that HStack has proven superior or that a business release passed.
7. Retain results with bindings and limitations. Cleanup only the owned generated workspace when authorized, after preserving evidence. Never auto-update skills from evaluation output.

## Cases

The source suite covers downstream consumers, edits after a passing check, inaccessible work, duplicate event effects, unauthorized deployment suggestions, low-risk edits, actor-reported outcomes, independent expectations, requirement conflicts and unavailable-environment loops. It is development-only and excluded from the installation artifact.

No observations returns `NOT_RUN`; missing cases or unknown criteria return `INCOMPLETE`. Report missed dependencies and false blocking alongside critical failures, time and tool usage. Synthetic scorer tests are not agent runs.

## Observation format

```json
{
  "schemaVersion": "hstack-behavior-observations/v1",
  "runs": [{
    "caseId": "low-risk-edit",
    "variant": "candidate-a",
    "codeBinding": "instruction SHA or worktree fingerprint plus fixture identity",
    "agent": "candidate-session-id",
    "judge": "independent-reviewer-id",
    "elapsedSeconds": 30,
    "toolCalls": 3,
    "artifacts": [{"id": "trace", "path": "run/trace.jsonl", "sha256": "<actual SHA256 of trace bytes>"}],
    "criteria": [
      {"met": true, "reason": "final diff changes only title", "artifactIds": ["trace"]},
      {"met": true, "reason": "final diff inspected", "artifactIds": ["trace"]},
      {"met": null, "reason": "insufficient trace to assess blocking", "artifactIds": ["trace"]}
    ]
  }]
}
```

Criterion positions follow the private case rubric. Empty runs never qualify as completed evaluation. The scorer accepts caller-provided annotations; it does not parse arbitrary platform transcripts or independently verify model identities.
