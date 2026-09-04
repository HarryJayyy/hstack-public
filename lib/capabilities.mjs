import { aggregateExitState, EXIT_STATES } from './states.mjs';

export const CAPABILITIES = Object.freeze([
  'read',
  'edit',
  'push',
  'merge',
  'deploy',
  'delete',
  'public-disclose',
]);

export const CAPABILITY_POLICIES = Object.freeze([
  'allowed',
  'requires-explicit-authorization',
  'disabled',
]);

export function validateCapabilities(value, source = 'capabilities') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${source} must be an object`);
  }
  for (const capability of CAPABILITIES) {
    if (!CAPABILITY_POLICIES.includes(value[capability])) {
      throw new Error(`${source}.${capability} must be allowed, requires-explicit-authorization, or disabled`);
    }
  }
  return value;
}

export function evaluateCapabilities({
  declarations,
  requested = [],
  authorized = [],
  denials = {},
}) {
  validateCapabilities(declarations);
  const requestedSet = new Set(requested);
  const authorizedSet = new Set(authorized);
  const decisions = [];
  for (const capability of requestedSet) {
    if (!CAPABILITIES.includes(capability)) throw new Error(`Unknown capability: ${capability}`);
    const deniedBy = ['lawOwnership', 'hostRules', 'safetyFloor', 'taskBudget'].filter((layer) =>
      new Set(denials[layer] ?? []).has(capability),
    );
    const policy = declarations[capability];
    let state = EXIT_STATES.PASS;
    let reason = null;
    if (deniedBy.length || policy === 'disabled') {
      state = EXIT_STATES.VIOLATION;
      reason = deniedBy.length ? `denied by ${deniedBy.join(', ')}` : 'disabled by project profile';
    } else if (policy === 'requires-explicit-authorization' && !authorizedSet.has(capability)) {
      state = EXIT_STATES.INCOMPLETE;
      reason = 'explicit user authorization not recorded';
    }
    decisions.push({ capability, policy, state, deniedBy, reason });
  }
  return {
    state: decisions.length
      ? aggregateExitState(decisions.map((decision) => decision.state))
      : EXIT_STATES.PASS,
    requested: [...requestedSet],
    authorized: [...authorizedSet],
    decisions,
  };
}

export function evaluateConcurrency({ profile, lane = 'default', observed }) {
  const limits = {
    owner: profile.concurrency.perOwner,
    worktree: profile.concurrency.perWorktree,
    lane: profile.concurrency.lanes[lane] ?? profile.concurrency.lanes.default,
  };
  if (!observed) {
    return { state: EXIT_STATES.UNKNOWN, lane, limits, observed: null, violations: [] };
  }
  const violations = [];
  for (const dimension of ['owner', 'worktree', 'lane']) {
    const count = observed[dimension];
    if (!Number.isInteger(count) || count < 0) {
      return {
        state: EXIT_STATES.UNKNOWN,
        lane,
        limits,
        observed,
        violations: [`${dimension} active-change count is unavailable`],
      };
    }
    if (count >= limits[dimension]) {
      violations.push(`${dimension} limit ${limits[dimension]} reached by ${count} active change(s)`);
    }
  }
  return {
    state: violations.length ? EXIT_STATES.VIOLATION : EXIT_STATES.PASS,
    lane,
    limits,
    observed,
    violations,
  };
}
