import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cli = resolve(root, 'bin/hstack.mjs');

function run(args, options = {}) {
  return spawnSync(process.execPath, [cli, ...args], {
    cwd: options.cwd ?? root,
    encoding: 'utf8',
    input: options.input,
  });
}

test('stable CLI reports help and package version', () => {
  const help = run(['--help']);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /Usage: hstack <command>/);
  const version = run(['version']);
  assert.equal(version.status, 0);
  assert.equal(version.stdout.trim(), '0.4.2');
});

test('stable CLI delegates commands without relying on host npm scripts', () => {
  const result = run(['route', '--help'], { cwd: dirname(root) });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Usage: hstack route/);
});

test('general redact CLI refuses output without caller-supplied sensitive values', () => {
  const blocked = run(['redact'], { input: JSON.stringify({ note: 'opaque-short-secret' }) });
  assert.equal(blocked.status, 3);
  assert.equal(blocked.stdout, '');
  assert.match(blocked.stderr, /requires --sensitive-values/);

  const directory = mkdtempSync(resolve(tmpdir(), 'hstack-redact-'));
  try {
    const valuesPath = resolve(directory, 'values.json');
    writeFileSync(valuesPath, JSON.stringify(['opaque-short-secret']));
    const allowed = run(['redact', '--sensitive-values', valuesPath], {
      input: JSON.stringify({ note: 'opaque-short-secret' }),
    });
    assert.equal(allowed.status, 0);
    assert.deepEqual(JSON.parse(allowed.stdout), { note: '<REDACTED>' });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('repeated operation flags are combined and cannot hide mutation', () => {
  const request = 'review the dependency graph';
  const result = run([
    'route',
    '--text', request,
    '--operations', 'inspect',
    '--operations', 'modify-repository',
    '--active-owner', '0',
    '--active-worktree', '0',
    '--active-lane', '0',
  ]);
  assert.equal(result.status, 0);
  const output = JSON.parse(result.stdout);
  assert.deepEqual(output.route.operations, ['inspect', 'modify-repository']);
  assert.equal(output.route.executionReady, undefined);
  assert.equal(output.route.classificationReady, true);
  assert.equal(output.route.authorizationAssessmentState, 'INCOMPLETE');
  assert.equal(output.route.stopReason, null);
});

test('route CLI is advisory-only and execute CLI accepts structured contracts only', () => {
  const request = 'review. fix the broken worker';
  const classification = run([
    'route',
    '--text', request,
    '--operations', 'inspect',
    '--active-owner', '0',
    '--active-worktree', '0',
    '--active-lane', '0',
  ]);
  assert.equal(classification.status, 0);
  const classificationOutput = JSON.parse(classification.stdout);
  assert.equal(classificationOutput.route.advisoryOnly, true);
  assert.equal(classificationOutput.route.classificationReady, true);
  assert.equal(classificationOutput.route.executionReady, undefined);

  const execution = run(['execute'], {
    input: JSON.stringify({
      operations: ['inspect'],
      sourceRequestDigest: 'a'.repeat(64),
      activeChanges: { owner: 0, worktree: 0, lane: 0 },
    }),
  });
  assert.equal(execution.status, 0);
  const executionOutput = JSON.parse(execution.stdout);
  assert.equal(executionOutput.execution.executionReady, true);
  assert.equal(executionOutput.execution.freeTextAccepted, false);
  assert.equal(executionOutput.execution.sourceRequestDigestPurpose, 'traceability-only-not-authority');

  const rejected = run(['execute'], {
    input: JSON.stringify({
      request,
      operations: ['inspect'],
      activeChanges: { owner: 0, worktree: 0, lane: 0 },
    }),
  });
  assert.notEqual(rejected.status, 0);
  assert.match(rejected.stderr, /unsupported fields: request/);
});

test('status command exposes the previously library-only composite verdict', () => {
  const result = run(['status'], {
    input: JSON.stringify({
      checks: [{ name: 'quality', category: 'quality', status: 'completed', conclusion: 'failure' }],
      approvalRequired: false,
      approved: false,
    }),
  });
  assert.equal(result.status, 2);
  const output = JSON.parse(result.stdout);
  assert.equal(output.state, 'VIOLATION');
  assert.deepEqual(output.components, ['NEEDS CORRECTION', 'CI COMPLETE - FAILED']);
});

test('event verification returns structured failure for a false PASS claim', () => {
  const result = run(['verify-event'], {
    input: JSON.stringify({ schemaVersion: 'hstack-event-proof/v1', state: 'PASS', exitCode: 0 }),
  });
  assert.equal(result.status, 2);
  const output = JSON.parse(result.stdout);
  assert.equal(output.valid, false);
  assert.equal(output.state, 'VIOLATION');
  assert.notEqual(output.evaluation.state, 'PASS');
  assert.match(output.declarationError, /declared PASS but derived/);
});

test('unknown CLI commands fail closed', () => {
  const result = run(['does-not-exist']);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Unknown HStack command/);
});
