# Task Playbooks

| Playbook | Required shape |
| --- | --- |
| Investigation | Reproduce or inspect, distinguish facts from hypotheses, no mutation unless separately authorized. |
| Bug fix | Prove the failure, add a regression check, implement the smallest causal fix, rerun adjacent checks. |
| Feature | Define actors, acceptance behavior, data and policy, implement vertically, verify primary and failure paths. |
| Refactor | Freeze observable behavior, map consumers, make reversible slices, prove behavior did not change. |
| Data migration | Define forward semantics, rehearsal, row-count and value readback, retry/idempotency, recovery path. |
| Integration | Freeze contract and ownership, exercise success/failure/retry, prove reconciliation and observability. |
| Performance forensics | Capture baseline and trace, isolate mechanism, change one causal lever, compare like-for-like. |
| Production incident | Stabilize first, preserve evidence, bound blast radius, make the safest reversible action, monitor. |
| Upgrade/backport | Inventory compatibility surfaces, read upstream migration notes, isolate changes, run a compatibility matrix. |
| Release verification | Bind expected artifacts and live behavior to the release SHA, environment, and observation window. |

For every playbook, layer on all applicable domain controls. A UI task that changes payment state is not merely a UI task.
