#!/usr/bin/env node

import { existsSync, statSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { loadProfile } from '../lib/profile.mjs';
import { run, tryRun } from '../lib/command.mjs';
import {
  classifyBranch,
  flattenPaginated,
  parseRefs,
  parseWorktrees,
  summarizeInventory,
} from '../lib/inventory.mjs';
import {
  correlateOpenChange,
  normalizeOpenChanges,
  normalizeRepository,
  repositoryAdapter,
} from '../lib/adapters.mjs';
import { createEvidenceEnvelope, evaluateFreshness } from '../lib/evidence.mjs';
import { toPublicInventory } from '../lib/public-output.mjs';
import { EXIT_STATES, exitCodeFor } from '../lib/states.mjs';
import { redactPublicHandoff, redactString } from '../lib/redaction.mjs';

function has(args, flag) {
  return args.includes(flag);
}

function mergeBases(branch, baseBranches, remote, cwd) {
  const merged = [];
  let unknown = false;
  for (const base of baseBranches) {
    const result = tryRun('git', ['merge-base', '--is-ancestor', branch, `${remote}/${base}`], { cwd });
    if (result.ok) merged.push(base);
    else if (!/failed \(1\)/.test(result.error)) unknown = true;
  }
  return { merged, unknown };
}

function fetchedRefTime(root) {
  const result = tryRun('git', ['rev-parse', '--git-path', 'FETCH_HEAD'], { cwd: root });
  if (!result.ok) return null;
  const value = result.output.trim();
  const path = isAbsolute(value) ? value : resolve(root, value);
  return existsSync(path) ? statSync(path).mtime.toISOString() : null;
}

function discoverRepository(root, profile, blockers) {
  const adapter = repositoryAdapter(profile.adapters.repository);
  const result = tryRun(adapter.cli, adapter.repositoryCommand, { cwd: root });
  if (!result.ok) {
    blockers.push(`Repository identity unavailable from ${adapter.cli}: ${result.error}`);
    return { adapter, repository: null };
  }
  try {
    return { adapter, repository: normalizeRepository(adapter.provider, JSON.parse(result.output)) };
  } catch (error) {
    blockers.push(`Repository identity response is invalid: ${error instanceof Error ? error.message : error}`);
    return { adapter, repository: null };
  }
}

function discoverOpenChanges(root, adapter, repository, blockers) {
  if (!repository) return [];
  const result = tryRun(adapter.cli, adapter.openChangesCommand(repository.identity), { cwd: root });
  if (!result.ok) {
    blockers.push(`Open ${adapter.changeKind} inventory unavailable: ${result.error}`);
    return [];
  }
  try {
    const raw = JSON.parse(result.output);
    const flattened = adapter.provider === 'github' ? flattenPaginated(raw) : raw;
    return normalizeOpenChanges(adapter.provider, flattened);
  } catch (error) {
    blockers.push(`Open ${adapter.changeKind} response is invalid: ${error instanceof Error ? error.message : error}`);
    return [];
  }
}

function markdown(report) {
  const lines = [
    '# HStack open-work inventory',
    '',
    `Generated: ${report.generatedAt}`,
    `Repository: ${report.repository ?? 'UNKNOWN'}`,
    `Provider: ${report.repositoryProvider}`,
    `Default branch: ${report.defaultBranch ?? 'UNKNOWN'}`,
    `Profile: ${report.profile.name} (${report.profile.authorityMode})`,
    `Evidence state: ${report.state}`,
    `Fetched-ref time: ${report.evidence.freshness.observedAt ?? 'UNKNOWN'}`,
    `Evidence TTL: ${report.evidence.freshness.ttlSeconds}s`,
    '',
    'Read-only report. Cleanup authority: NONE.',
    '',
    `## Summary`,
    '',
    `- Open changes: ${report.openChanges.length}`,
    `- Attached worktrees: ${report.worktrees.length}`,
    `- Dirty worktrees: ${report.summary.dirtyWorktrees}`,
    `- Confirmed clean worktrees: ${report.summary.confirmedCleanWorktrees}`,
    `- Unknown worktree states: ${report.summary.unknownWorktrees}`,
    `- Base branches preserved: ${report.summary.baseBranches}`,
    `- Branches requiring individual review: ${report.summary.branchesRequiringReview}`,
    `- Cleanup candidates: ${report.summary.cleanupCandidates}`,
    '',
    '## Branches',
    '',
    '| Branch | HEAD | Classification |',
    '| --- | --- | --- |',
  ];
  for (const branch of report.branches) {
    lines.push(`| ${branch.name} | ${branch.head.slice(0, 12)} | ${branch.classification} |`);
  }
  if (!report.branches.length) lines.push('| None | | |');
  if (report.blockers.length) {
    lines.push('', '## Blockers', '');
    for (const blocker of report.blockers) lines.push(`- ${blocker}`);
  }
  return lines.join('\n');
}

function publicMarkdown(report) {
  return [
    '# HStack public open-work summary',
    '',
    `Generated: ${report.generatedAt}`,
    `Evidence state: ${report.state}`,
    '',
    'Read-only summary. Cleanup authority: NONE.',
    '',
    '## Counts',
    '',
    `- Open changes: ${report.counts.openChanges}`,
    `- Attached worktrees: ${report.counts.worktrees}`,
    `- Dirty worktrees: ${report.summary.dirtyWorktrees}`,
    `- Unknown worktree states: ${report.summary.unknownWorktrees}`,
    `- Branches requiring review: ${report.summary.branchesRequiringReview}`,
    `- Cleanup candidates: ${report.summary.cleanupCandidates}`,
    `- Blockers: ${report.counts.blockers}`,
  ].join('\n');
}

export function buildInventory(cwd = process.cwd(), explicitProfile) {
  const root = run('git', ['rev-parse', '--show-toplevel'], { cwd }).trim();
  const { profile, source } = loadProfile({ cwd: root, explicitPath: explicitProfile });
  const headSha = run('git', ['rev-parse', 'HEAD'], { cwd: root }).trim();
  const branchResult = tryRun('git', ['branch', '--show-current'], { cwd: root });
  const branch = branchResult.ok ? branchResult.output.trim() || null : null;
  const worktrees = parseWorktrees(run('git', ['worktree', 'list', '--porcelain'], { cwd: root }));
  for (const worktree of worktrees) {
    const state = tryRun('git', ['-C', worktree.path, 'status', '--porcelain'], { cwd: root });
    worktree.dirty = state.ok ? state.output.split(/\r?\n/).filter(Boolean).length : null;
    worktree.stateError = state.ok ? null : state.error;
  }

  const blockers = [];
  const discovery = discoverRepository(root, profile, blockers);
  const repositoryContext = discovery.repository;
  const openChanges = discoverOpenChanges(root, discovery.adapter, repositoryContext, blockers);
  const defaultBranch = repositoryContext?.defaultBranch ?? profile.baseBranches[0] ?? null;
  const effectiveBaseBranches = [...new Set([defaultBranch, ...profile.baseBranches].filter(Boolean))];

  const refFormat = '%(refname:short)%09%(objectname)%09%(upstream:short)%09%(committerdate:iso8601)';
  const localBranches = parseRefs(
    run('git', ['for-each-ref', `--format=${refFormat}`, 'refs/heads'], { cwd: root }),
  );
  const worktreeByBranch = new Map(
    worktrees.filter((worktree) => worktree.branch).map((worktree) => [worktree.branch, worktree]),
  );
  const branches = localBranches.map((branch) => {
    const worktree = worktreeByBranch.get(branch.name);
    const correlation = repositoryContext
      ? correlateOpenChange({
          branch: branch.name,
          headSha: branch.head,
          repository: repositoryContext,
          changes: openChanges,
        })
      : { exact: null, mismatch: null };
    const pr = correlation.exact ?? correlation.mismatch;
    const bases = mergeBases(
      branch.name,
      pr ? [pr.baseRef] : effectiveBaseBranches,
      profile.primaryRemote,
      root,
    );
    return {
      ...branch,
      pullRequest: pr,
      mergedBases: bases.merged,
      mergeStateUnknown: bases.unknown,
      classification: classifyBranch({
        name: branch.name,
        head: branch.head,
        baseBranches: effectiveBaseBranches,
        protectedBranches: profile.protectedBranches,
        attached: Boolean(worktree),
        dirty: worktree?.dirty ?? 0,
        worktreeUnknown: Boolean(worktree && worktree.dirty === null),
        mergedBases: bases.merged,
        pullRequest: pr,
      }),
    };
  });

  const summary = summarizeInventory(worktrees, branches);

  const fetchedAt = fetchedRefTime(root);
  const freshness = {
    ...evaluateFreshness({
      observedAt: fetchedAt,
      ttlSeconds: profile.evidence.ttlSeconds,
    }),
    basis: 'git FETCH_HEAD mtime',
    remote: profile.primaryRemote,
  };
  const remoteUrlResult = tryRun('git', ['remote', 'get-url', profile.primaryRemote], { cwd: root });
  const findings = [];
  if (blockers.length) {
    findings.push({
      state: EXIT_STATES.INCOMPLETE,
      code: 'ADAPTER_INCOMPLETE',
      message: `${blockers.length} required adapter operation(s) failed`,
    });
  }
  if (summary.unknownWorktrees) {
    findings.push({
      state: EXIT_STATES.UNKNOWN,
      code: 'WORKTREE_STATE_UNKNOWN',
      message: `${summary.unknownWorktrees} worktree state(s) could not be inspected`,
    });
  }
  const mismatches = branches.filter((item) => item.classification.includes('SHA MISMATCH')).length;
  if (mismatches) {
    findings.push({
      state: EXIT_STATES.INCOMPLETE,
      code: 'OPEN_CHANGE_SHA_MISMATCH',
      message: `${mismatches} branch/open-change identity mismatch(es) require review`,
    });
  }
  const evidence = createEvidenceEnvelope({
    subject: 'open-work-inventory',
    repository: {
      provider: profile.adapters.repository,
      identity: repositoryContext?.identity ?? 'UNKNOWN',
      remote: profile.primaryRemote,
      remoteUrl: remoteUrlResult.ok ? redactString(remoteUrlResult.output.trim()) : null,
      defaultBranch,
    },
    revision: {
      headSha,
      branch,
      dirty: (() => {
        const current = worktrees.find(
          (item) => resolve(item.path).toLowerCase() === resolve(root).toLowerCase(),
        );
        return current ? current.dirty !== 0 : null;
      })(),
    },
    source: {
      kind: 'local-git-plus-provider-api',
      repositoryAdapter: profile.adapters.repository,
      ciAdapter: profile.adapters.ci,
      frameworkAdapters: profile.adapters.frameworks,
      deploymentAdapters: profile.adapters.deployments,
    },
    freshness,
    capabilities: profile.capabilities,
    findings,
    artifacts: [
      { kind: 'open-change-count', value: openChanges.length },
      { kind: 'worktree-count', value: worktrees.length },
      { kind: 'branch-review-count', value: summary.branchesRequiringReview },
    ],
    invalidationTriggers: profile.evidence.invalidationTriggers,
  });

  return {
    schemaVersion: 1,
    state: evidence.state,
    generatedAt: evidence.generatedAt,
    repository: repositoryContext?.identity ?? null,
    repositoryProvider: profile.adapters.repository,
    defaultBranch,
    profileSource: source,
    profile: { name: profile.name, authorityMode: profile.authorityMode },
    openChanges,
    pullRequests: openChanges.filter((change) => change.kind === 'pull-request'),
    worktrees,
    branches,
    summary,
    blockers,
    evidence,
  };
}

const args = process.argv.slice(2);
if (has(args, '--help') || has(args, '-h')) {
  console.log('Usage: hstack inventory [--repo path] [--json] [--public] [--profile path]');
  console.log('Read-only. It does not fetch, checkout, stash, prune, push, merge, or delete.');
} else {
  const profileIndex = args.indexOf('--profile');
  const repoIndex = args.indexOf('--repo');
  const cwd = repoIndex === -1 ? process.cwd() : args[repoIndex + 1];
  if (!cwd) throw new Error('--repo requires a path');
  const report = buildInventory(cwd, profileIndex === -1 ? undefined : args[profileIndex + 1]);
  const publicReport = has(args, '--public')
    ? redactPublicHandoff(toPublicInventory(report))
    : null;
  const rendered = publicReport
    ? (has(args, '--json') ? publicReport : publicMarkdown(publicReport))
    : (has(args, '--json') ? report : markdown(report));
  console.log(typeof rendered === 'string' ? rendered : JSON.stringify(rendered, null, 2));
  process.exitCode = exitCodeFor(report.state);
}
