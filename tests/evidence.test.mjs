import test from 'node:test';
import assert from 'node:assert/strict';
import { createEvidenceEnvelope, evaluateFreshness, validateEvidenceEnvelope } from '../lib/evidence.mjs';

test('freshness distinguishes pass, stale, and unknown', () => {
  const now = new Date('2026-08-29T10:10:00.000Z');
  assert.equal(evaluateFreshness({ observedAt: '2026-08-29T10:09:30.000Z', ttlSeconds: 60, now }).state, 'PASS');
  assert.equal(evaluateFreshness({ observedAt: '2026-08-29T10:00:00.000Z', ttlSeconds: 60, now }).state, 'STALE');
  assert.equal(evaluateFreshness({ observedAt: null, ttlSeconds: 60, now }).state, 'UNKNOWN');
});

test('machine-readable envelope binds repository, revision, TTL, and invalidation', () => {
  const envelope = createEvidenceEnvelope({
    subject: 'verification',
    repository: { provider: 'github', identity: 'owner/repo', remote: 'origin', defaultBranch: 'main' },
    revision: { headSha: 'abc123', branch: 'feature/x', worktreeFingerprint: 'hash', dirty: false },
    source: { kind: 'local-test' },
    freshness: { state: 'PASS', observedAt: '2026-08-29T10:00:00.000Z', ttlSeconds: 900 },
    findings: [{ state: 'INCOMPLETE', code: 'APPROVAL_MISSING', message: 'approval required' }],
    invalidationTriggers: ['head-changed', 'deployment-changed'],
    generatedAt: '2026-08-29T10:00:00.000Z',
  });
  assert.equal(envelope.state, 'INCOMPLETE');
  assert.equal(envelope.exitCode, 3);
  assert.equal(envelope.schemaVersion, 'hstack-evidence/v1');
  assert.equal(validateEvidenceEnvelope(envelope), envelope);
});
