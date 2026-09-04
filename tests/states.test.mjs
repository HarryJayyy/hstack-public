import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateExitState, EXIT_CODES, exitCodeFor } from '../lib/states.mjs';

test('exit states keep stable machine codes', () => {
  assert.deepEqual(EXIT_CODES, { PASS: 0, VIOLATION: 2, INCOMPLETE: 3, STALE: 4, UNKNOWN: 5 });
  for (const [state, code] of Object.entries(EXIT_CODES)) assert.equal(exitCodeFor(state), code);
});

test('known violations and incompleteness outrank uncertainty and staleness', () => {
  assert.equal(aggregateExitState(['PASS', 'STALE']), 'STALE');
  assert.equal(aggregateExitState(['STALE', 'UNKNOWN']), 'UNKNOWN');
  assert.equal(aggregateExitState(['UNKNOWN', 'INCOMPLETE']), 'INCOMPLETE');
  assert.equal(aggregateExitState(['INCOMPLETE', 'VIOLATION']), 'VIOLATION');
});
