import test from 'node:test';
import assert from 'node:assert/strict';
import { validateProfile } from '../lib/profile.mjs';

const valid = {
  schemaVersion: 1,
  name: 'test',
  authorityMode: 'overlay',
  provider: 'github',
  primaryRemote: 'origin',
  baseBranches: ['main'],
  protectedBranches: ['main'],
  frameworkProfiles: ['generic'],
  publicHandoffs: false,
  capabilities: {
    read: 'allowed', edit: 'requires-explicit-authorization',
    push: 'requires-explicit-authorization', merge: 'requires-explicit-authorization',
    deploy: 'requires-explicit-authorization', delete: 'requires-explicit-authorization',
    'public-disclose': 'disabled',
  },
  concurrency: { perOwner: 1, perWorktree: 1, lanes: { default: 1 } },
  evidence: { ttlSeconds: 900, invalidationTriggers: ['head-changed'] },
  adapters: { repository: 'github', ci: 'github-actions', frameworks: ['generic'], deployments: [] },
  riskRules: [],
  verification: { typeCheck: [], unit: [], integration: [], build: [], live: [] },
};

test('valid profile passes', () => {
  assert.equal(validateProfile(valid), valid);
});

test('unknown authority mode fails closed', () => {
  assert.throws(() => validateProfile({ ...valid, authorityMode: 'replace-host' }), /authorityMode/);
});

test('owner concurrency limit must be positive', () => {
  assert.throws(
    () => validateProfile({ ...valid, concurrency: { ...valid.concurrency, perOwner: 0 } }),
    /positive integer/,
  );
});
