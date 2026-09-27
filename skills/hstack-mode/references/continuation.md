# Continue Through a Blocked Item

Use this procedure when the current request contains multiple independent authorized items, or an
active item has independent acceptance criteria that can be completed separately. It does not create
a standing backlog or authorize work merely because it would keep the agent busy.

## Establish the run

1. State a checkable exit condition for the requested outcome. For each item, record its acceptance
   check, dependencies, permitted operations, owner or worktree, and the smallest required proof.
   Reuse a host issue, PR, plan or task list rather than copying it into another tracking system.
2. Order ready items by the user's priority. With no stated priority, prefer a verified code
   correction, then a change with completable proof, then a bounded review, then necessary evidence
   or documentation maintenance. Do not start a dependent item to manufacture progress.
3. Keep item status separate from run status: `ACTIVE`, `PARKED`, `PASS`, or `NEEDS CORRECTION` for an
   item. A run with parked required items is not `PASS`, even if other items are complete.

Within an active item, settle observable questions with code, existing records or a bounded check.
Routine reversible decisions within scope do not require another user turn. A missing consequential
owner decision blocks only behavior that depends on it.

## On a blocker

1. Read current state once and bind the observation to its SHA, run ID, environment and time where
   relevant. Distinguish a code defect from unavailable infrastructure, missing policy or approval,
   and an unknown cause. Spend at most one bounded recovery or discriminating check unless the user
   supplied another budget. A known code defect within scope is work to fix, not a reason to park.
2. If the condition is unchanged, do not repeat the same test, probe, restart or poll. Mark the item
   `PARKED`; record the exact blocker, evidence, last attempt and specific resume condition. Keep its
   branch, worktree, fixtures and partial evidence intact.
   For a consequential owner choice, first check existing policy and prior decisions. Request the
   unresolved choice once with concrete options; keep only dependent work parked while awaiting it.
3. Select the highest-value independent item whose dependencies are satisfied and whose operations
   remain authorized under the host rules. Check its own ownership, worktree and concurrency state
   before mutation. A prior item's authorization or passing check cannot be borrowed for this one.
4. Resume a parked item only after a material state change, decision, completed dependency, new
   discriminating evidence or explicit reprioritization. Re-read its current identity and evidence
   freshness before acting.

## Waiting and closeout

- Use the host's event or recurring mechanism when the user asked HStack to monitor or continue
  later. A one-time check is sufficient when no monitor was requested. Avoid sleeping workers and
  unchanged polling while independent work is available.
- If no independent authorized item exists, report the blocker, resume condition and precise next
  owner action. Do not invent another feature, relax a required gate, merge, deploy or clean up to
  avoid ending the run.
- On handoff, show what passed, what was parked and what remains unverified. Preserve each item's
  exact-state evidence. The overall verdict follows the required unfinished work; completion of a
  different item cannot turn it into `PASS`.
- After a repeated workflow failure, record the friction and a proposed structural improvement for
  later review. Changing HStack's prompts or router during the task is separate work and needs its
  own evaluation; one successful anecdote is not proof of a better workflow.
