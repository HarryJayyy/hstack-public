import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyBranch,
  flattenPaginated,
  parseRefs,
  parseWorktrees,
  summarizeInventory,
} from '../lib/inventory.mjs';

test('parseWorktrees preserves spaced paths and worktree state', () => {
  const parsed = parseWorktrees(
    'worktree C:/dev/My Project\nHEAD abc123\nbranch refs/heads/feature/x\nlocked reason here\n\n',
  );
  assert.deepEqual(parsed, [
    { path: 'C:/dev/My Project', head: 'abc123', branch: 'feature/x', locked: 'reason here' },
  ]);
});

test('parseRefs reads tab-separated branch facts', () => {
  assert.deepEqual(parseRefs('main\tabc\torigin/main\t2026-08-29 10:00:00 +0800\n'), [
    { name: 'main', head: 'abc', upstream: 'origin/main', updated: '2026-08-29 10:00:00 +0800' },
  ]);
});

test('pull request correlation requires exact head SHA', () => {
  const classification = classifyBranch({
    name: 'feature/x',
    head: 'local-sha',
    baseBranches: ['main'],
    attached: true,
    dirty: 0,
    worktreeUnknown: false,
    pullRequest: { number: 42, headSha: 'different-sha' },
  });
  assert.equal(classification, 'OPEN PR #42 SHA MISMATCH — PRESERVE');
});

test('dirty attached work is preserved', () => {
  assert.equal(
    classifyBranch({
      name: 'feature/x', head: 'abc', baseBranches: ['main'], attached: true,
      dirty: 2, worktreeUnknown: false,
    }),
    'ATTACHED, DIRTY — PRESERVE',
  );
});

test('merged detached branch is only a verified cleanup candidate', () => {
  assert.equal(
    classifyBranch({
      name: 'feature/x', head: 'abc', baseBranches: ['main'], attached: false,
      dirty: 0, worktreeUnknown: false, mergedBases: ['main'],
    }),
    'MERGED CLEANUP CANDIDATE (main) — VERIFY',
  );
});

test('protected non-base branches are always preserved', () => {
  const classification = classifyBranch({
    name: 'release/controlled',
    head: 'abc',
    baseBranches: ['main'],
    protectedBranches: ['release/controlled'],
    attached: false,
    dirty: 0,
    worktreeUnknown: false,
    mergedBases: ['main'],
  });
  assert.equal(classification, 'PROTECTED BRANCH — PRESERVE');
  assert.equal(summarizeInventory([], [{ classification }]).cleanupCandidates, 0);
});

test('base branch classification remains stable when it is also protected', () => {
  assert.equal(
    classifyBranch({
      name: 'main', head: 'abc', baseBranches: ['main'], protectedBranches: ['main'],
      attached: false, dirty: 0, worktreeUnknown: false, mergedBases: ['main'],
    }),
    'BASE BRANCH — PRESERVE',
  );
});

test('GitHub pagination is flattened without assuming page count', () => {
  assert.deepEqual(flattenPaginated([[{ number: 1 }], [{ number: 2 }]]), [
    { number: 1 }, { number: 2 },
  ]);
});

test('inaccessible worktrees remain unknown and are never counted clean', () => {
  const summary = summarizeInventory(
    [{ path: 'clean', dirty: 0 }, { path: 'dirty', dirty: 2 }, { path: 'unknown', dirty: null }],
    [],
  );
  assert.equal(summary.confirmedCleanWorktrees, 1);
  assert.equal(summary.dirtyWorktrees, 1);
  assert.equal(summary.unknownWorktrees, 1);
});
