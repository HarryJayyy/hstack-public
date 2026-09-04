import test from 'node:test';
import assert from 'node:assert/strict';
import { assessChangeStatus } from '../lib/change-status.mjs';

test('completed multi-gate failures produce a composite verdict without calling CI incomplete', () => {
  const result = assessChangeStatus({
    checks: [
      { name: 'static integration', category: 'static', status: 'completed', conclusion: 'success' },
      {
        name: 'live owner guard', category: 'live-integration', status: 'completed',
        conclusion: 'failure', expected: 409, actual: 500,
      },
      { name: 'quality gate', category: 'quality', status: 'completed', conclusion: 'failure' },
      { name: 'bar raiser', category: 'review-policy', status: 'completed', conclusion: 'failure' },
    ],
    approvalRequired: true,
    approved: false,
  });
  assert.equal(result.state, 'VIOLATION');
  assert.equal(result.ciLifecycle, 'CI COMPLETE - FAILED');
  assert.deepEqual(result.components, [
    'NEEDS CORRECTION',
    'NEEDS INVESTIGATION',
    'BLOCKED REVIEW/POLICY',
    'CI COMPLETE - FAILED',
  ]);
});

test('a required skipped or conclusion-less check remains incomplete', () => {
  const result = assessChangeStatus({
    checks: [{ name: 'required live check', status: 'completed', conclusion: null, required: true }],
  });
  assert.equal(result.state, 'INCOMPLETE');
  assert.equal(result.ciLifecycle, 'CI INCOMPLETE');
});
