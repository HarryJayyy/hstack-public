# Closeout

Report the outcome first, followed by:

- exact state verified;
- material changes;
- checks passed, failed, skipped, blocked, or still pending;
- business and operational proof beyond compilation;
- current PR/review/deploy/live status when in scope;
- intentionally preserved work and out-of-scope findings;
- final verdict and single safest next action.

Verdict rules:

- Use `PASS` only when every required check is satisfied on the final state.
- Use `NEEDS CORRECTION` for a verified in-scope defect or failed required check.
- Use `BLOCKED BUSINESS DECISION` when owner policy is required.
- Use `BLOCKED EXTERNAL` when authority, review, service, credential, or environment prevents completion.
- Use `PARKED` only for an explicit owner decision; preserve work and disabled controls.
- Use `UNVERIFIED` for missing, stale, or mismatched evidence.

Multiple conditions may coexist; do not hide a defect behind a blocked review or pending CI status.

For a completed failing check set, say `CI COMPLETE - FAILED`; do not say CI is incomplete. Separate source/quality failures (`NEEDS CORRECTION`), unexplained runtime mismatches (`NEEDS INVESTIGATION`), and approval/policy gates (`BLOCKED REVIEW/POLICY`).
