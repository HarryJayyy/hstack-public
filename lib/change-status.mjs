import { aggregateExitState, EXIT_STATES } from './states.mjs';

const CORRECTION_CATEGORIES = new Set(['quality', 'static', 'build', 'security']);
const INVESTIGATION_CATEGORIES = new Set(['live-integration', 'runtime', 'staging']);
const REVIEW_CATEGORIES = new Set(['review-policy', 'approval']);

export function assessChangeStatus({ checks = [], approvalRequired = false, approved = false }) {
  const normalized = checks.map((check) => ({
    name: check.name,
    category: check.category ?? 'static',
    status: check.status ?? 'unknown',
    conclusion: check.conclusion ?? null,
    expected: check.expected ?? null,
    actual: check.actual ?? null,
    required: check.required ?? true,
  }));
  const incomplete = normalized.filter(
    (check) => check.required && (check.status !== 'completed' || check.conclusion === null),
  );
  const failed = normalized.filter(
    (check) => check.status === 'completed' && check.conclusion === 'failure',
  );
  const components = [];
  if (failed.some((check) => CORRECTION_CATEGORIES.has(check.category))) {
    components.push('NEEDS CORRECTION');
  }
  if (failed.some((check) => INVESTIGATION_CATEGORIES.has(check.category))) {
    components.push('NEEDS INVESTIGATION');
  }
  if (
    failed.some((check) => REVIEW_CATEGORIES.has(check.category)) ||
    (approvalRequired && !approved)
  ) {
    components.push('BLOCKED REVIEW/POLICY');
  }
  let ciLifecycle = 'CI COMPLETE - PASSED';
  if (incomplete.length) ciLifecycle = 'CI INCOMPLETE';
  else if (failed.length) ciLifecycle = 'CI COMPLETE - FAILED';
  components.push(ciLifecycle);

  const states = [];
  if (failed.length) states.push(EXIT_STATES.VIOLATION);
  if (incomplete.length || (approvalRequired && !approved)) states.push(EXIT_STATES.INCOMPLETE);
  if (!normalized.length) states.push(EXIT_STATES.UNKNOWN);
  if (!states.length) states.push(EXIT_STATES.PASS);

  return {
    state: aggregateExitState(states),
    components,
    ciLifecycle,
    complete: incomplete.length === 0 && normalized.length > 0,
    passed: incomplete.length === 0 && failed.length === 0 && normalized.length > 0,
    failed,
    incomplete,
    approval: { required: approvalRequired, approved },
  };
}
