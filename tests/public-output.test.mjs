import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PUBLIC_FINGERPRINT_FIELDS,
  PUBLIC_INVENTORY_FIELDS,
  toPublicFingerprint,
  toPublicInventory,
} from '../lib/public-output.mjs';

const privateEvidence = {
  schemaVersion: 'hstack-evidence/v1',
  state: 'PASS',
  exitCode: 0,
  generatedAt: '2026-09-01T00:00:00.000Z',
  subject: 'test',
  repository: { identity: 'private-owner/private-repo', remoteUrl: 'https://host/private' },
  revision: { headSha: 'private-sha', branch: 'customer/private-work' },
  source: { profileSource: 'C:/private/profile.json' },
  capabilities: { publicDisclose: 'disabled' },
  freshness: {
    state: 'PASS',
    observedAt: '2026-09-01T00:00:00.000Z',
    ttlSeconds: 900,
    expiresAt: '2026-09-01T00:15:00.000Z',
    reason: null,
    remote: 'private-remote',
  },
  findings: [{ state: 'INCOMPLETE', code: 'SAFE_CODE', message: 'private provider error' }],
};

test('public inventory is an exact aggregate allowlist', () => {
  const output = toPublicInventory({
    schemaVersion: 1,
    state: 'PASS',
    generatedAt: '2026-09-01T00:00:00.000Z',
    repository: 'private-owner/private-repo',
    defaultBranch: 'private-main',
    profileSource: 'C:/private/profile.json',
    profile: { name: 'private-profile' },
    openChanges: [{ title: 'private customer work', url: 'https://host/private/pr/1' }],
    worktrees: [{ path: 'C:/private/worktree' }],
    branches: [{ name: 'customer/private-work', head: 'private-sha' }],
    blockers: ['private provider error'],
    summary: {
      dirtyWorktrees: 1,
      confirmedCleanWorktrees: 0,
      unknownWorktrees: 0,
      baseBranches: 1,
      preserveOrReviewBranches: 2,
      branchesRequiringReview: 1,
      cleanupCandidates: 0,
    },
    evidence: privateEvidence,
  });
  assert.deepEqual(Object.keys(output), PUBLIC_INVENTORY_FIELDS);
  assert.deepEqual(Object.keys(output.evidence), [
    'schemaVersion', 'state', 'exitCode', 'generatedAt', 'subject', 'freshness', 'findings',
  ]);
  assert.deepEqual(output.counts, { openChanges: 1, worktrees: 1, blockers: 1 });
  const serialized = JSON.stringify(output);
  for (const privateValue of ['private-owner', 'private-repo', 'private-main', 'private-profile',
    'private customer work', 'customer/private-work', 'private-sha', 'C:/private', 'provider error']) {
    assert.equal(serialized.includes(privateValue), false, `leaked ${privateValue}`);
  }
});

test('public fingerprint omits repository identity, refs, paths, and digests', () => {
  const output = toPublicFingerprint({
    schemaVersion: 1,
    state: 'PASS',
    generatedAt: '2026-09-01T00:00:00.000Z',
    repositoryRoot: 'C:/private/worktree',
    head: 'private-sha',
    fingerprint: 'private-fingerprint',
    dirty: true,
    untrackedCount: 2,
    untrackedMode: 'metadata-only-no-file-content-read',
    evidence: privateEvidence,
  });
  assert.deepEqual(Object.keys(output), PUBLIC_FINGERPRINT_FIELDS);
  assert.equal(output.dirty, true);
  assert.equal(output.untrackedCount, 2);
  const serialized = JSON.stringify(output);
  for (const privateValue of ['private-owner', 'private-repo', 'private-sha', 'private-fingerprint',
    'customer/private-work', 'C:/private', 'private-remote']) {
    assert.equal(serialized.includes(privateValue), false, `leaked ${privateValue}`);
  }
});
