import test from 'node:test';
import assert from 'node:assert/strict';
import {
  changeIdentity,
  correlateOpenChange,
  createDeploymentIdentity,
  normalizeCiChecks,
  normalizeOpenChanges,
  normalizeRepository,
  parseRemoteIdentity,
} from '../lib/adapters.mjs';

test('GitHub correlation requires repository owner identity and exact SHA', () => {
  const repository = normalizeRepository('github', {
    nameWithOwner: 'owner/repo', defaultBranchRef: { name: 'main' },
  });
  const changes = normalizeOpenChanges('github', [
    { number: 1, title: 'fork', head: { ref: 'feature/x', sha: 'abc', repo: { id: 11, full_name: 'fork/repo' } }, base: { ref: 'main' } },
    { number: 2, title: 'exact', head: { ref: 'feature/x', sha: 'abc', repo: { id: 10, full_name: 'owner/repo' } }, base: { ref: 'main' } },
  ]);
  const result = correlateOpenChange({ branch: 'feature/x', headSha: 'abc', repository, changes });
  assert.equal(result.exact.number, 2);
  assert.equal(changeIdentity(result.exact), 'github:owner/repo@abc');
});

test('CI adapters normalize completed failure without calling it pending', () => {
  const [github] = normalizeCiChecks('github-actions', [
    { name: 'integration', status: 'COMPLETED', conclusion: 'FAILURE', detailsUrl: 'https://example' },
  ]);
  const [gitlab] = normalizeCiChecks('gitlab-ci', [
    { name: 'integration', stage: 'test', status: 'failed', web_url: 'https://example' },
  ]);
  assert.equal(github.status, 'completed');
  assert.equal(github.conclusion, 'failure');
  assert.equal(gitlab.status, 'completed');
  assert.equal(gitlab.conclusion, 'failure');
});

test('deployment identity binds provider, environment, and revision', () => {
  assert.deepEqual(
    createDeploymentIdentity({ provider: 'cloudflare-workers', identity: 'deployment-1', environment: 'staging', revision: 'abc' }),
    { provider: 'cloudflare-workers', identity: 'deployment-1', environment: 'staging', revision: 'abc' },
  );
});

test('GitLab merge requests normalize with source project id and SHA', () => {
  const [change] = normalizeOpenChanges('gitlab', [{
    iid: 7, title: 'MR', source_branch: 'feature/x', sha: 'def', source_project_id: 21,
    target_branch: 'main', web_url: 'https://gitlab.example/x',
  }]);
  assert.equal(changeIdentity(change), 'gitlab:21@def');
});

test('remote identity parser supports HTTPS and SSH remotes', () => {
  assert.equal(parseRemoteIdentity('github', 'https://github.com/owner/repo.git').identity, 'owner/repo');
  assert.equal(parseRemoteIdentity('gitlab', 'git@gitlab.com:group/repo.git').identity, 'group/repo');
});
