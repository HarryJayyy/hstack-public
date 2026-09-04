#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { statSync } from 'node:fs';
import { resolve } from 'node:path';
import { run, tryRun } from '../lib/command.mjs';
import { parseRemoteIdentity } from '../lib/adapters.mjs';
import { createEvidenceEnvelope, evaluateFreshness } from '../lib/evidence.mjs';
import { loadProfile } from '../lib/profile.mjs';
import { toPublicFingerprint } from '../lib/public-output.mjs';
import { EXIT_STATES, exitCodeFor } from '../lib/states.mjs';
import { redactPublicHandoff, redactString } from '../lib/redaction.mjs';

export function createFingerprint(cwd = process.cwd(), explicitProfile) {
  const root = run('git', ['rev-parse', '--show-toplevel'], { cwd }).trim();
  const { profile, source: profileSource } = loadProfile({ cwd: root, explicitPath: explicitProfile });
  const head = run('git', ['rev-parse', 'HEAD'], { cwd: root }).trim();
  const branchResult = tryRun('git', ['branch', '--show-current'], { cwd: root });
  const branch = branchResult.ok ? branchResult.output.trim() || null : null;
  const status = run('git', ['status', '--porcelain=v2', '--untracked-files=all'], { cwd: root });
  const staged = run('git', ['diff', '--cached', '--binary', '--no-ext-diff'], { cwd: root });
  const unstaged = run('git', ['diff', '--binary', '--no-ext-diff'], { cwd: root });
  const untrackedRaw = run('git', ['ls-files', '--others', '--exclude-standard', '-z'], { cwd: root });
  const untracked = untrackedRaw
    .split('\0')
    .filter(Boolean)
    .sort()
    .map((path) => {
      const stat = statSync(resolve(root, path));
      return { path, size: stat.size, modifiedMs: Math.trunc(stat.mtimeMs) };
    });
  const hash = createHash('sha256');
  hash.update(JSON.stringify({ head, status, staged, unstaged, untracked }));
  const fingerprint = hash.digest('hex');
  const remoteResult = tryRun('git', ['remote', 'get-url', profile.primaryRemote], { cwd: root });
  const remoteUrl = remoteResult.ok ? remoteResult.output.trim() : null;
  const remoteIdentity = parseRemoteIdentity(profile.adapters.repository, remoteUrl);
  const defaultResult = tryRun(
    'git',
    ['symbolic-ref', '--short', `refs/remotes/${profile.primaryRemote}/HEAD`],
    { cwd: root },
  );
  const defaultBranch = defaultResult.ok
    ? defaultResult.output.trim().replace(`${profile.primaryRemote}/`, '')
    : profile.baseBranches[0] ?? null;
  const generatedAt = new Date().toISOString();
  const findings = [];
  if (!remoteIdentity) {
    findings.push({
      state: EXIT_STATES.UNKNOWN,
      code: 'REPOSITORY_IDENTITY_UNKNOWN',
      message: `remote ${profile.primaryRemote} identity is unavailable`,
    });
  }
  const evidence = createEvidenceEnvelope({
    subject: 'worktree-fingerprint',
    repository: {
      provider: profile.adapters.repository,
      identity: remoteIdentity?.identity ?? 'UNKNOWN',
      remote: profile.primaryRemote,
      remoteUrl: remoteUrl ? redactString(remoteUrl) : null,
      defaultBranch,
    },
    revision: {
      headSha: head,
      branch,
      worktreeFingerprint: fingerprint,
      dirty: status.trim().length > 0,
    },
    source: {
      kind: 'local-git',
      profileSource,
      repositoryAdapter: profile.adapters.repository,
      ciAdapter: profile.adapters.ci,
      frameworkAdapters: profile.adapters.frameworks,
      deploymentAdapters: profile.adapters.deployments,
    },
    freshness: evaluateFreshness({
      observedAt: generatedAt,
      ttlSeconds: profile.evidence.ttlSeconds,
      now: new Date(generatedAt),
    }),
    capabilities: profile.capabilities,
    findings,
    artifacts: [{ kind: 'untracked-count', value: untracked.length }],
    invalidationTriggers: profile.evidence.invalidationTriggers,
    generatedAt,
  });
  return {
    schemaVersion: 1,
    state: evidence.state,
    generatedAt,
    repositoryRoot: root,
    head,
    fingerprint,
    dirty: status.trim().length > 0,
    untrackedCount: untracked.length,
    untrackedMode: 'metadata-only-no-file-content-read',
    evidence,
  };
}

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log('Usage: hstack fingerprint [--repo path] [--profile path] [--public]');
  console.log('Prints a read-only working-state fingerprint. Untracked file contents are never read.');
} else {
  const repoIndex = args.indexOf('--repo');
  const cwd = repoIndex === -1 ? process.cwd() : args[repoIndex + 1];
  if (!cwd) throw new Error('--repo requires a path');
  const profileIndex = args.indexOf('--profile');
  const result = createFingerprint(cwd, profileIndex === -1 ? undefined : args[profileIndex + 1]);
  const output = args.includes('--public')
    ? redactPublicHandoff(toPublicFingerprint(result))
    : result;
  console.log(JSON.stringify(output, null, 2));
  process.exitCode = exitCodeFor(result.state);
}
