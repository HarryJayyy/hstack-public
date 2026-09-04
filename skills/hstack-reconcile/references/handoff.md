# Durable Handoff

Record:

- objective and bounded scope;
- repository, branch, worktree, and exact HEAD;
- authority mode and risk band;
- files and external state changed;
- verification commands, results, environment, and evidence freshness;
- open PR and gate status correlated to exact SHA;
- unresolved defects, decisions, risks, and intentionally preserved work;
- final verdict;
- the single safest next action.

Never compress a failed check, pending gate, or unverified live state into “done.”

For any handoff intended to be public, run automatic secret and absolute-path redaction first. Public disclosure also requires the profile capability and explicit authorization; redaction does not grant publication authority.
