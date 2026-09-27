import { evaluateCapabilities, evaluateConcurrency } from './capabilities.mjs';
import { aggregateExitState, EXIT_STATES } from './states.mjs';
import { posix } from 'node:path';

export const RULE_PRECEDENCE = Object.freeze([
  'law-and-ownership-boundaries',
  'explicit-user-authorization',
  'host-repository-mandatory-rules',
  'hstack-safety-floor',
  'project-profile',
  'task-specific-execution-budget',
]);

const PLAYBOOK_TERMS = [
  ['production-incident', /\b(incident|outage|corrupt(?:ion|ed)?|data loss|production down)\b/i],
  ['upgrade-backport', /\b(upgrade|backport|version migration|dependency bump)\b/i],
  ['performance-forensics', /\b(performance|slow|latency|timeout|cpu|memory|throughput)\b/i],
  ['investigation', /\b(investigate|audit|review|explain|why|trace|assess)\b/i],
  ['refactor', /\b(refactor|restructure|rename|cleanup code|simplify)\b/i],
  ['data-migration', /\b(migration|schema|backfill|patch(?:es)?|data repair)\b/i],
  ['bug-fix', /\b(fix|bug|defect|regression|broken|incorrect)\b/i],
];

const OVERLAY_TERMS = [
  ['money-ledger', /\b(accounting|ledger|invoice|payment|refund|credit note|debit note|tax|currency|commission|payroll)\b/i],
  ['stock-valuation', /\b(stock|inventory|valuation|warehouse|batch|serial|goods receipt|repost)\b/i],
  ['document-lifecycle', /\b(submit|cancel|amend|finali[sz]ed|status transition|void|approve|release)\b/i],
  ['authorization', /\b(auth|authorization|permission|role|tenant|rls|ownership|branch scope|privilege)\b/i],
  ['regional-compliance', /\b(compliance|statutory|pdpa|e-invoice|einvoice|legal|jurisdiction|sst|vat|gst)\b/i],
  ['async-concurrency', /\b(queue|worker|scheduler|cron|async|asynchronous(?:ly)?|concurrent(?:ly)?|concurrency|race|retry(?:ing)?|retries|retried|idempotent(?:ly)?|idempotency|idempotence|outbox|webhook)\b/i],
  ['data-migration', /\b(migration|schema|backfill|patch(?:es)?|data repair|ddl)\b/i],
  ['integration-contract', /\b(api|rpc|integration|webhook|sync|import|export|edi|oauth)\b/i],
  ['ui-browser', /\b(ui|form|dashboard|report|print|browser|responsive|accessibility|locale|i18n)\b/i],
  ['deployment-operations', /\b(deploy|release|production|staging|rollback|monitor|canary)\b/i],
];

const HIGH_OVERLAYS = new Set([
  'money-ledger',
  'stock-valuation',
  'authorization',
  'regional-compliance',
  'data-migration',
]);
const MODERATE_OVERLAYS = new Set([
  'document-lifecycle',
  'async-concurrency',
  'integration-contract',
  'deployment-operations',
]);

const MUTATION_CAPABILITIES = new Set([
  'edit',
  'push',
  'merge',
  'deploy',
  'delete',
  'public-disclose',
]);
const READ_ONLY_PLAYBOOKS = new Set(['investigation', 'performance-forensics', 'release-verification']);
const OPERATION_CAPABILITIES = Object.freeze({
  inspect: 'read',
  'modify-repository': 'edit',
  'push-branch': 'push',
  'merge-change': 'merge',
  deploy: 'deploy',
  delete: 'delete',
  publish: 'public-disclose',
});

function inferPlaybook(text, explicit) {
  if (explicit) return explicit;
  for (const [playbook, pattern] of PLAYBOOK_TERMS) {
    if (pattern.test(text)) return playbook;
  }
  return 'feature';
}

function canonicalRiskPath(value) {
  if (typeof value !== 'string' || !value.trim()) throw new Error('task paths must be non-empty strings');
  const portable = value.trim().replace(/\\/g, '/');
  if (/^(?:[A-Za-z]:|\/)/.test(portable)) {
    throw new Error(`task paths must be repository-relative: ${value}`);
  }
  const normalized = posix.normalize(portable);
  if (normalized === '..' || normalized.startsWith('../')) {
    throw new Error(`task path escapes the repository: ${value}`);
  }
  return normalized.replace(/^\.\//, '').replace(/\/+$/, '');
}

function profileOverlays(paths, profile) {
  const overlays = [];
  for (const rule of profile.riskRules ?? []) {
    const prefixes = (rule.pathPrefixes ?? []).map(canonicalRiskPath);
    if (prefixes.some((prefix) =>
      paths.some((path) => path === prefix || path.startsWith(`${prefix}/`)))) {
      overlays.push(...(rule.overlays ?? []));
    }
  }
  return overlays;
}

function riskBand(playbook, overlays, task) {
  if (task.irreversible || (task.live && playbook === 'production-incident')) return 'critical';
  if (overlays.some((overlay) => HIGH_OVERLAYS.has(overlay))) return 'high';
  if (overlays.some((overlay) => MODERATE_OVERLAYS.has(overlay))) return 'moderate';
  return 'low';
}

function verificationAdapters(overlays, playbook) {
  const adapters = new Set(['focused-regression', 'diff-inspection']);
  if (overlays.includes('money-ledger')) adapters.add('ledger-reconcile');
  if (overlays.includes('stock-valuation')) adapters.add('stock-replay-readback');
  if (overlays.includes('authorization')) adapters.add('permission-matrix');
  if (overlays.includes('regional-compliance')) adapters.add('policy-source-check');
  if (overlays.includes('async-concurrency')) adapters.add('retry-concurrency-proof');
  if (overlays.includes('data-migration')) adapters.add('migration-rehearsal-readback');
  if (overlays.includes('integration-contract')) adapters.add('contract-replay');
  if (overlays.includes('ui-browser')) adapters.add('browser-journey');
  if (overlays.includes('deployment-operations')) adapters.add('post-deploy-watch');
  if (playbook === 'performance-forensics') adapters.add('before-after-trace');
  if (playbook === 'upgrade-backport') adapters.add('compatibility-matrix');
  return [...adapters];
}

function inferLane(overlays, explicit) {
  if (explicit) return explicit;
  if (overlays.includes('data-migration')) return 'database';
  if (overlays.includes('money-ledger')) return 'financial';
  if (overlays.includes('stock-valuation')) return 'stock';
  if (overlays.includes('deployment-operations')) return 'release';
  return 'default';
}

function evaluateDeclaredTask(task, profile) {
  if (task.request !== undefined && typeof task.request !== 'string') {
    throw new Error('task.request must be a string');
  }
  if (task.classificationBinding !== undefined) {
    throw new Error('task.classificationBinding is not an authority input; route is advisory-only');
  }
  if (task.intent !== undefined && !['read', 'mutate'].includes(task.intent)) {
    throw new Error('task.intent must be read or mutate');
  }
  for (const field of [
    'paths', 'domains', 'operations', 'requestedCapabilities', 'authorizedCapabilities',
  ]) {
    if (task[field] !== undefined && !Array.isArray(task[field])) {
      throw new Error(`task.${field} must be an array`);
    }
    if (Array.isArray(task[field]) && !task[field].every((value) => typeof value === 'string')) {
      throw new Error(`task.${field} must contain only strings`);
    }
  }
  const normalized = {
    request: task.request ?? '',
    paths: task.paths?.map(canonicalRiskPath) ?? [],
    domains: task.domains ?? [],
    operations: task.operations ?? [],
    explicitPlaybook: task.playbook,
    live: Boolean(task.live),
    irreversible: Boolean(task.irreversible),
    policyDefined: task.policyDefined ?? null,
    requestedCapabilities: task.requestedCapabilities ?? [],
    authorizedCapabilities: task.authorizedCapabilities ?? [],
    denials: task.denials && typeof task.denials === 'object' ? task.denials : {},
    activeChanges: task.activeChanges && typeof task.activeChanges === 'object' ? task.activeChanges : null,
    lane: task.lane,
    executionBudget: task.executionBudget && typeof task.executionBudget === 'object'
      ? task.executionBudget
      : {},
    intent: task.intent ?? null,
  };
  const searchable = [normalized.request, ...normalized.paths, ...normalized.domains].join(' ');
  const inferredPlaybook = inferPlaybook(searchable, normalized.explicitPlaybook);
  const inspectOnly = normalized.operations.length > 0 &&
    normalized.operations.every((operation) => operation === 'inspect');
  const playbook = !normalized.explicitPlaybook && inspectOnly && inferredPlaybook === 'feature'
    ? 'investigation'
    : inferredPlaybook;
  const overlays = new Set(normalized.domains);
  for (const [overlay, pattern] of OVERLAY_TERMS) {
    if (pattern.test(searchable)) overlays.add(overlay);
  }
  for (const overlay of profileOverlays(normalized.paths, profile)) overlays.add(overlay);
  const overlayList = [...overlays].sort();
  const risk = riskBand(playbook, overlayList, normalized);
  const businessSensitive = overlayList.some((overlay) =>
    ['money-ledger', 'regional-compliance', 'document-lifecycle'].includes(overlay),
  );
  const requiresBusinessDecision = businessSensitive && normalized.policyDefined !== true;
  const mutationPermittedByMode = profile.authorityMode !== 'advisory';
  const unknownOperations = normalized.operations.filter(
    (operation) => !Object.hasOwn(OPERATION_CAPABILITIES, operation),
  );
  const derivedCapabilities = [...new Set(normalized.operations
    .filter((operation) => Object.hasOwn(OPERATION_CAPABILITIES, operation))
    .map((operation) => OPERATION_CAPABILITIES[operation]))];
  const operationIntent = normalized.operations.length === 0
    ? null
    : derivedCapabilities.some((capability) => MUTATION_CAPABILITIES.has(capability))
      ? 'mutate'
      : 'read';
  const requestedCapabilitySet = new Set(normalized.requestedCapabilities);
  const operationCapabilitySet = new Set(derivedCapabilities);
  const capabilityMismatch = normalized.operations.length > 0 &&
    normalized.requestedCapabilities.length > 0 &&
    (requestedCapabilitySet.size !== operationCapabilitySet.size ||
      [...requestedCapabilitySet].some((capability) => !operationCapabilitySet.has(capability)));
  const contradictionReasons = [];
  if (normalized.intent && operationIntent && normalized.intent !== operationIntent) {
    contradictionReasons.push('intent contradicts declared operations');
  }
  if (
    operationIntent === 'read' &&
    normalized.explicitPlaybook &&
    !READ_ONLY_PLAYBOOKS.has(normalized.explicitPlaybook)
  ) {
    contradictionReasons.push('read operation contradicts mutating playbook');
  }
  if (capabilityMismatch) contradictionReasons.push('requested capabilities contradict operations');
  let operationState = EXIT_STATES.PASS;
  if (contradictionReasons.length > 0) operationState = EXIT_STATES.VIOLATION;
  else if (unknownOperations.length > 0) operationState = EXIT_STATES.INCOMPLETE;
  else if (normalized.operations.length === 0) operationState = EXIT_STATES.INCOMPLETE;
  const effectiveRequestedCapabilities = derivedCapabilities;
  const requestedMutationCapabilities = effectiveRequestedCapabilities.filter((capability) =>
    MUTATION_CAPABILITIES.has(capability));
  const authorizedCapabilitySet = new Set(normalized.authorizedCapabilities);
  const missingMutationAuthorizations = requestedMutationCapabilities.filter(
    (capability) => !authorizedCapabilitySet.has(capability),
  );
  const mutationIntent = operationIntent === 'read' ? false : true;
  let mutationAuthorityState = EXIT_STATES.PASS;
  if (mutationIntent && !mutationPermittedByMode) {
    mutationAuthorityState = EXIT_STATES.VIOLATION;
  } else if (mutationIntent && requestedMutationCapabilities.length === 0) {
    mutationAuthorityState = EXIT_STATES.INCOMPLETE;
  } else if (mutationIntent && missingMutationAuthorizations.length > 0) {
    mutationAuthorityState = EXIT_STATES.INCOMPLETE;
  }
  const lane = inferLane(overlayList, normalized.lane);
  const capabilities = evaluateCapabilities({
    declarations: profile.capabilities,
    requested: effectiveRequestedCapabilities,
    authorized: normalized.authorizedCapabilities,
    denials: normalized.denials,
  });
  const concurrency = evaluateConcurrency({
    profile,
    lane,
    observed: normalized.activeChanges,
  });
  const routingState = aggregateExitState([
    requiresBusinessDecision ? EXIT_STATES.INCOMPLETE : EXIT_STATES.PASS,
    operationState,
  ]);
  const classificationState = aggregateExitState([
    requiresBusinessDecision ? EXIT_STATES.INCOMPLETE : EXIT_STATES.PASS,
    operationState,
    capabilities.state,
    mutationAuthorityState,
  ]);
  const controlState = aggregateExitState([classificationState, concurrency.state]);
  let stopReason = null;
  if (
    capabilities.state === EXIT_STATES.VIOLATION ||
    concurrency.state === EXIT_STATES.VIOLATION ||
    operationState === EXIT_STATES.VIOLATION ||
    mutationAuthorityState === EXIT_STATES.VIOLATION
  ) {
    stopReason = 'VIOLATION';
  } else if (requiresBusinessDecision) {
    stopReason = 'BLOCKED BUSINESS DECISION';
  } else if (operationState === EXIT_STATES.INCOMPLETE) {
    stopReason = 'BLOCKED OPERATION';
  } else if (
    capabilities.state === EXIT_STATES.INCOMPLETE ||
    mutationAuthorityState === EXIT_STATES.INCOMPLETE
  ) {
    stopReason = 'BLOCKED AUTHORIZATION';
  } else if (concurrency.state === EXIT_STATES.UNKNOWN) {
    stopReason = 'UNKNOWN CONCURRENCY';
  }

  return {
    schemaVersion: 1,
    routingState,
    classificationState,
    controlState,
    precedence: RULE_PRECEDENCE,
    authorityMode: profile.authorityMode,
    mutationPermittedByMode,
    intent: operationIntent ?? normalized.intent,
    mutationIntent,
    operations: normalized.operations,
    operationState,
    unknownOperations,
    derivedCapabilities,
    contradictionReasons,
    requestedMutationCapabilities,
    missingMutationAuthorizations,
    playbook,
    riskBand: risk,
    overlays: overlayList,
    frameworkProfiles: profile.frameworkProfiles,
    adapters: profile.adapters,
    capabilities,
    concurrency,
    executionBudget: normalized.executionBudget,
    verificationAdapters: verificationAdapters(overlayList, playbook),
    gates: {
      reconcileOpenWork: true,
      discoverHostPolicy: true,
      writeChangeContract: playbook !== 'investigation',
      requireBusinessDecision: requiresBusinessDecision,
      requireExplicitMutationAuthority: mutationIntent,
      preserveAmbiguity: true,
      bindEvidenceToState: true,
    },
    stopReason,
  };
}

export function routeTask(task, profile) {
  const result = evaluateDeclaredTask(task, profile);
  const classification = { ...result };
  delete classification.controlState;
  delete classification.classificationState;
  delete classification.mutationIntent;
  delete classification.stopReason;
  let advisoryStopReason = null;
  if (result.operationState === EXIT_STATES.VIOLATION) advisoryStopReason = 'VIOLATION';
  else if (result.gates.requireBusinessDecision) advisoryStopReason = 'BLOCKED BUSINESS DECISION';
  else if (result.operationState === EXIT_STATES.INCOMPLETE) advisoryStopReason = 'BLOCKED OPERATION';
  return {
    ...classification,
    advisoryOnly: true,
    advisoryState: result.routingState,
    classificationReady: result.routingState === EXIT_STATES.PASS,
    declaredOperationsReady: result.operationState === EXIT_STATES.PASS,
    declaredMutationIntent: result.mutationIntent,
    authorizationAssessmentState: result.classificationState,
    stopReason: advisoryStopReason,
  };
}

export function evaluateExecutionTask(task, profile) {
  if (!task || typeof task !== 'object' || Array.isArray(task)) {
    throw new Error('execution task must be an object');
  }
  const allowedFields = new Set([
    'operations',
    'authorizedCapabilities',
    'denials',
    'activeChanges',
    'lane',
    'executionBudget',
    'sourceRequestDigest',
  ]);
  const unknownFields = Object.keys(task).filter((field) => !allowedFields.has(field));
  if (unknownFields.length > 0) {
    throw new Error(`execution task contains unsupported fields: ${unknownFields.join(', ')}`);
  }
  if (
    task.sourceRequestDigest !== undefined &&
    (typeof task.sourceRequestDigest !== 'string' || !/^[a-f0-9]{64}$/i.test(task.sourceRequestDigest))
  ) {
    throw new Error('execution task sourceRequestDigest must be a SHA-256 hex digest');
  }
  const result = evaluateDeclaredTask({
    operations: task.operations,
    authorizedCapabilities: task.authorizedCapabilities,
    denials: task.denials,
    activeChanges: task.activeChanges,
    lane: task.lane,
    executionBudget: task.executionBudget,
  }, profile);
  return {
    schemaVersion: 1,
    state: result.controlState,
    executionReady: result.controlState === EXIT_STATES.PASS,
    contractType: 'structured-execution',
    freeTextAccepted: false,
    operations: result.operations,
    derivedCapabilities: result.derivedCapabilities,
    mutationIntent: result.mutationIntent,
    requestedMutationCapabilities: result.requestedMutationCapabilities,
    missingMutationAuthorizations: result.missingMutationAuthorizations,
    authorityMode: result.authorityMode,
    mutationPermittedByMode: result.mutationPermittedByMode,
    capabilities: result.capabilities,
    concurrency: result.concurrency,
    executionBudget: result.executionBudget,
    sourceRequestDigest: task.sourceRequestDigest?.toLowerCase() ?? null,
    sourceRequestDigestPurpose: 'traceability-only-not-authority',
    stopReason: result.stopReason,
  };
}

export const knownPlaybooks = [
  'investigation',
  'bug-fix',
  'feature',
  'refactor',
  'data-migration',
  'integration',
  'performance-forensics',
  'production-incident',
  'upgrade-backport',
  'release-verification',
];
