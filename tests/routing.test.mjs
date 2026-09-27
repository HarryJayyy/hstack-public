import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readProfile } from '../lib/profile.mjs';
import { evaluateExecutionTask, routeTask } from '../lib/routing.mjs';
import { RULE_PRECEDENCE } from '../lib/routing.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const generic = readProfile(resolve(root, 'profiles/generic.json'));
const highAssurance = readProfile(resolve(root, 'profiles/high-assurance-system.json'));

test('async wording selects retry proof without granting execution authority', () => {
  for (const term of ['idempotency', 'idempotence', 'idempotent', 'concurrency', 'concurrent', 'concurrently', 'retry', 'retries', 'retrying', 'retried', 'worker', 'queue', 'webhook', 'asynchronous']) {
    const route = routeTask({ request: `fix ${term} in event processing`, operations: ['inspect'] }, generic);
    assert.ok(route.overlays.includes('async-concurrency'), `missing overlay for ${term}`);
    assert.ok(route.verificationAdapters.includes('retry-concurrency-proof'), `missing proof for ${term}`);
    assert.equal(route.riskBand, 'moderate');
    assert.equal(route.advisoryOnly, true);
    assert.equal(route.executionReady, undefined);
  }
});

test('async keywords do not match unrelated substrings or authorize mutations', () => {
  const ordinary = routeTask({ request: 'fix the artwork and questionnaire title', operations: ['inspect'] }, generic);
  assert.deepEqual(ordinary.overlays, []);
  const classification = routeTask({ request: 'fix idempotency', operations: ['modify-repository'] }, generic);
  assert.ok(classification.overlays.includes('async-concurrency'));
  assert.equal(classification.authorizationAssessmentState, 'INCOMPLETE');
  assert.equal(classification.executionReady, undefined);
});

test('financial behavior requires an explicit business decision and ledger proof', () => {
  const route = routeTask({ request: 'fix invoice tax rounding in the ledger' }, generic);
  assert.equal(route.playbook, 'bug-fix');
  assert.equal(route.riskBand, 'high');
  assert.equal(route.stopReason, 'BLOCKED BUSINESS DECISION');
  assert.ok(route.overlays.includes('money-ledger'));
  assert.ok(route.verificationAdapters.includes('ledger-reconcile'));
});

test('defined policy clears the business decision gate', () => {
  const route = routeTask(
    {
      request: 'fix invoice tax rounding in the ledger',
      policyDefined: true,
      operations: ['modify-repository'],
      authorizedCapabilities: ['edit'],
      activeChanges: { owner: 0, worktree: 0, lane: 0 },
    },
    generic,
  );
  assert.equal(route.stopReason, null);
  assert.equal(route.gates.requireBusinessDecision, false);
});

test('financial path applies only the money and ledger overlay', () => {
  const route = routeTask(
    {
      request: 'fix incorrect balance',
      paths: ['src/accounting/journal-entry.ts'],
      requestedCapabilities: ['edit'],
    },
    highAssurance,
  );
  assert.deepEqual(route.overlays, ['money-ledger']);
  assert.equal(route.authorityMode, 'overlay');
  assert.equal(route.gates.requireExplicitMutationAuthority, true);
  assert.equal(route.operationState, 'INCOMPLETE');
  assert.deepEqual(route.capabilities.requested, []);
});

test('inventory task composes valuation and ledger proof from path and request', () => {
  const route = routeTask(
    { request: 'fix backdated inventory receipt that posts to the ledger', paths: ['src/inventory/stock-entry.ts'] },
    highAssurance,
  );
  assert.ok(route.overlays.includes('stock-valuation'));
  assert.ok(route.overlays.includes('money-ledger'));
  assert.ok(route.verificationAdapters.includes('stock-replay-readback'));
  assert.ok(route.verificationAdapters.includes('ledger-reconcile'));
});

test('high-assurance migration composes database and deployment controls', () => {
  const route = routeTask(
    { request: 'add a migration', paths: ['database/migrations/20260829000000_example.sql'] },
    highAssurance,
  );
  assert.equal(route.authorityMode, 'overlay');
  assert.equal(route.riskBand, 'high');
  for (const overlay of [
    'data-migration',
    'deployment-operations',
  ]) {
    assert.ok(route.overlays.includes(overlay), `missing ${overlay}`);
  }
});

test('ordinary dashboard layout remains low risk', () => {
  const route = routeTask({ request: 'build a responsive dashboard layout' }, generic);
  assert.equal(route.playbook, 'feature');
  assert.equal(route.riskBand, 'low');
  assert.deepEqual(route.overlays, ['ui-browser']);
  assert.ok(route.verificationAdapters.includes('browser-journey'));
});

test('advisory mode never grants mutation', () => {
  const profile = { ...generic, authorityMode: 'advisory' };
  const route = routeTask({
    request: 'investigate the dependency graph',
    intent: 'read',
    operations: ['inspect'],
    activeChanges: { owner: 0, worktree: 0, lane: 0 },
  }, profile);
  assert.equal(route.playbook, 'investigation');
  assert.equal(route.mutationPermittedByMode, false);
  assert.equal(route.declaredMutationIntent, false);
  assert.equal(route.classificationReady, true);
  assert.equal(route.executionReady, undefined);
  assert.equal(route.gates.writeChangeContract, false);
});

test('mutating operations require an explicit authorized mutation capability', () => {
  for (const authorizedCapabilities of [undefined, [], ['read']]) {
    const execution = evaluateExecutionTask({
      operations: ['modify-repository'],
      authorizedCapabilities,
      activeChanges: { owner: 0, worktree: 0, lane: 0 },
    }, generic);
    assert.equal(execution.mutationIntent, true);
    assert.equal(execution.executionReady, false);
    assert.equal(execution.stopReason, 'BLOCKED AUTHORIZATION');
  }

  const authorized = evaluateExecutionTask({
    operations: ['modify-repository'],
    authorizedCapabilities: ['edit'],
    activeChanges: { owner: 0, worktree: 0, lane: 0 },
  }, generic);
  assert.equal(authorized.executionReady, true);
  assert.equal(authorized.stopReason, null);
});

test('free-text routing is advisory only for every wording and punctuation form', () => {
  for (const request of [
    'review and fix the broken worker',
    'review. fix the broken worker',
    'review — fix the broken worker',
    'review / fix the broken worker',
    'review\nfix the broken worker',
    'review plus fix the broken worker',
    'investigate and rotate the key',
  ]) {
    const route = routeTask({
      request,
      intent: 'read',
      operations: ['inspect'],
      activeChanges: { owner: 0, worktree: 0, lane: 0 },
    }, generic);
    assert.equal(route.playbook, 'investigation');
    assert.equal(route.declaredMutationIntent, false);
    assert.equal(route.advisoryOnly, true);
    assert.equal(route.executionReady, undefined);
    assert.equal(route.classificationReady, true);
    assert.equal(route.operationState, 'PASS');
    assert.equal(route.stopReason, null);
  }
});

test('route reports declared-operation classification without execution readiness', () => {
  const omitted = routeTask({
    request: 'review the dependency graph',
    activeChanges: { owner: 0, worktree: 0, lane: 0 },
  }, generic);
  assert.equal(omitted.classificationReady, false);
  assert.equal(omitted.executionReady, undefined);
  assert.equal(omitted.stopReason, 'BLOCKED OPERATION');

  const confirmed = routeTask({
    request: 'review the dependency graph',
    intent: 'read',
    operations: ['inspect'],
    activeChanges: { owner: 0, worktree: 0, lane: 0 },
  }, generic);
  assert.equal(confirmed.declaredMutationIntent, false);
  assert.equal(confirmed.classificationReady, true);
  assert.equal(confirmed.executionReady, undefined);
  assert.equal(confirmed.stopReason, null);
  assert.throws(
    () => routeTask({ request: 'review the dependency graph', intent: 'unknown' }, generic),
    /task\.intent must be read or mutate/,
  );
});

test('structured operations derive capabilities and reject contradictions', () => {
  const inspect = routeTask({
    request: 'review the dependency graph',
    operations: ['inspect'],
    activeChanges: { owner: 0, worktree: 0, lane: 0 },
  }, generic);
  assert.equal(inspect.intent, 'read');
  assert.deepEqual(inspect.derivedCapabilities, ['read']);
  assert.equal(inspect.classificationReady, true);
  assert.equal(inspect.executionReady, undefined);

  const operationOnlyInspect = routeTask({
    operations: ['inspect'],
    activeChanges: { owner: 0, worktree: 0, lane: 0 },
  }, generic);
  assert.equal(operationOnlyInspect.playbook, 'investigation');
  assert.equal(operationOnlyInspect.classificationReady, true);

  const unauthorizedMutation = evaluateExecutionTask({
    operations: ['modify-repository'],
    activeChanges: { owner: 0, worktree: 0, lane: 0 },
  }, generic);
  assert.equal(unauthorizedMutation.stopReason, 'BLOCKED AUTHORIZATION');

  const authorizedMutation = evaluateExecutionTask({
    operations: ['modify-repository'],
    authorizedCapabilities: ['edit'],
    activeChanges: { owner: 0, worktree: 0, lane: 0 },
  }, generic);
  assert.equal(authorizedMutation.executionReady, true);

  const unknown = routeTask({
    operations: ['unknown-operation'],
    activeChanges: { owner: 0, worktree: 0, lane: 0 },
  }, generic);
  assert.equal(unknown.operationState, 'INCOMPLETE');
  assert.equal(unknown.stopReason, 'BLOCKED OPERATION');

  const mismatch = routeTask({
    request: 'review the dependency graph',
    operations: ['inspect'],
    requestedCapabilities: ['edit'],
    activeChanges: { owner: 0, worktree: 0, lane: 0 },
  }, generic);
  assert.equal(mismatch.operationState, 'VIOLATION');
  assert.equal(mismatch.classificationReady, false);
  assert.equal(mismatch.executionReady, undefined);
});

test('structured execution rejects free text and treats source digests as traceability only', () => {
  const digest = 'a'.repeat(64);
  const execution = evaluateExecutionTask({
    operations: ['inspect'],
    sourceRequestDigest: digest,
    activeChanges: { owner: 0, worktree: 0, lane: 0 },
  }, generic);
  assert.equal(execution.executionReady, true);
  assert.equal(execution.sourceRequestDigest, digest);
  assert.equal(execution.sourceRequestDigestPurpose, 'traceability-only-not-authority');
  assert.throws(
    () => evaluateExecutionTask({
      request: 'review. fix the broken worker',
      operations: ['inspect'],
      activeChanges: { owner: 0, worktree: 0, lane: 0 },
    }, generic),
    /unsupported fields: request/,
  );
  assert.throws(
    () => routeTask({
      request: 'review the dependency graph',
      operations: ['inspect'],
      classificationBinding: {},
    }, generic),
    /route is advisory-only/,
  );
});

test('malformed structured array fields fail closed instead of becoming absent', () => {
  for (const [field, value] of [
    ['paths', 'src\\workers\\task.ts'],
    ['domains', 'authorization'],
    ['operations', 'inspect'],
    ['requestedCapabilities', 'edit'],
    ['authorizedCapabilities', 'edit'],
  ]) {
    assert.throws(
      () => routeTask({
        request: 'review the dependency graph',
        intent: 'read',
        [field]: value,
        activeChanges: { owner: 0, worktree: 0, lane: 0 },
      }, generic),
      new RegExp(`task\\.${field} must be an array`),
    );
  }
  assert.throws(
    () => routeTask({ request: 'review', intent: 'read', paths: [42] }, generic),
    /task\.paths must contain only strings/,
  );
});

test('project-level allowed mutation still requires explicit task authorization', () => {
  const profile = {
    ...generic,
    capabilities: { ...generic.capabilities, edit: 'allowed' },
  };
  const blocked = evaluateExecutionTask({
    operations: ['modify-repository'],
    activeChanges: { owner: 0, worktree: 0, lane: 0 },
  }, profile);
  assert.deepEqual(blocked.missingMutationAuthorizations, ['edit']);
  assert.equal(blocked.executionReady, false);
  assert.equal(blocked.stopReason, 'BLOCKED AUTHORIZATION');
});

test('advisory mode blocks an explicitly authorized mutation', () => {
  const route = evaluateExecutionTask({
    operations: ['modify-repository'],
    authorizedCapabilities: ['edit'],
    activeChanges: { owner: 0, worktree: 0, lane: 0 },
  }, { ...generic, authorityMode: 'advisory' });
  assert.equal(route.state, 'VIOLATION');
  assert.equal(route.executionReady, false);
});

test('risk paths normalize Windows separators and dot segments without widening prefixes', () => {
  const variants = [
    'src/workers/task.ts',
    'src\\workers\\task.ts',
    '.\\src\\workers\\task.ts',
    'src/temp/../workers/task.ts',
  ];
  for (const path of variants) {
    const route = routeTask({ request: 'update task', paths: [path] }, highAssurance);
    assert.ok(route.overlays.includes('async-concurrency'), `missing async overlay for ${path}`);
    assert.ok(route.overlays.includes('integration-contract'), `missing integration overlay for ${path}`);
  }
  const sibling = routeTask({ request: 'update task', paths: ['src/workers-old/task.ts'] }, highAssurance);
  assert.deepEqual(sibling.overlays, []);
  assert.throws(
    () => routeTask({ request: 'update task', paths: ['../outside/task.ts'] }, highAssurance),
    /escapes the repository/,
  );
  assert.throws(
    () => routeTask({ request: 'update task', paths: ['C:..\\outside\\task.ts'] }, highAssurance),
    /repository-relative/,
  );
});

test('irreversible production corruption response is critical', () => {
  const route = routeTask(
    { request: 'repair production data corruption', live: true, irreversible: true },
    highAssurance,
  );
  assert.equal(route.playbook, 'production-incident');
  assert.equal(route.riskBand, 'critical');
  assert.equal(route.gates.requireExplicitMutationAuthority, true);
});

test('rule precedence is explicit and stable', () => {
  const route = routeTask({ request: 'review the code' }, generic);
  assert.deepEqual(route.precedence, RULE_PRECEDENCE);
  assert.deepEqual(route.precedence, [
    'law-and-ownership-boundaries',
    'explicit-user-authorization',
    'host-repository-mandatory-rules',
    'hstack-safety-floor',
    'project-profile',
    'task-specific-execution-budget',
  ]);
});

test('disabled public disclosure is a violation even when requested and authorized', () => {
  const route = evaluateExecutionTask(
    {
      operations: ['publish'],
      authorizedCapabilities: ['public-disclose'],
    },
    highAssurance,
  );
  assert.equal(route.state, 'VIOLATION');
  assert.equal(route.stopReason, 'VIOLATION');
});

test('lane concurrency limit prevents a second active database change', () => {
  const route = evaluateExecutionTask(
    {
      operations: ['inspect'],
      lane: 'database',
      activeChanges: { owner: 0, worktree: 0, lane: 1 },
    },
    highAssurance,
  );
  assert.equal(route.concurrency.state, 'VIOLATION');
  assert.equal(route.state, 'VIOLATION');
  assert.equal(route.executionReady, false);
});

test('unreconciled concurrency is explicit and prevents execution readiness', () => {
  const route = evaluateExecutionTask({
    operations: ['modify-repository'],
    authorizedCapabilities: ['edit'],
  }, generic);
  assert.equal(route.state, 'UNKNOWN');
  assert.equal(route.executionReady, false);
  assert.equal(route.stopReason, 'UNKNOWN CONCURRENCY');
});

test('task budget can narrow an authorized project capability', () => {
  const route = evaluateExecutionTask(
    {
      operations: ['push-branch'],
      authorizedCapabilities: ['push'],
      denials: { taskBudget: ['push'] },
      activeChanges: { owner: 0, worktree: 0, lane: 0 },
    },
    generic,
  );
  assert.equal(route.capabilities.state, 'VIOLATION');
  assert.deepEqual(route.capabilities.decisions[0].deniedBy, ['taskBudget']);
  assert.equal(route.executionReady, false);
});
