const ADAPTERS = Object.freeze({
  github: {
    provider: 'github',
    cli: 'gh',
    changeKind: 'pull-request',
    repositoryCommand: ['repo', 'view', '--json', 'nameWithOwner,defaultBranchRef,url'],
    openChangesCommand(identity) {
      return ['api', '--paginate', '--slurp', `repos/${identity}/pulls?state=open&per_page=100`];
    },
  },
  gitlab: {
    provider: 'gitlab',
    cli: 'glab',
    changeKind: 'merge-request',
    repositoryCommand: ['api', 'projects/:fullpath'],
    openChangesCommand() {
      return ['api', 'projects/:fullpath/merge_requests?state=opened&per_page=100', '--paginate'];
    },
  },
});

const CI_ADAPTERS = Object.freeze({
  'github-actions': { provider: 'github-actions', repositoryProvider: 'github' },
  'gitlab-ci': { provider: 'gitlab-ci', repositoryProvider: 'gitlab' },
  external: { provider: 'external', repositoryProvider: null },
  none: { provider: 'none', repositoryProvider: null },
});

export function repositoryAdapter(provider) {
  const adapter = ADAPTERS[provider];
  if (!adapter) throw new Error(`Unsupported repository adapter: ${provider}`);
  return adapter;
}

export function ciAdapter(provider) {
  const adapter = CI_ADAPTERS[provider];
  if (!adapter) throw new Error(`Unsupported CI adapter: ${provider}`);
  return adapter;
}

export function normalizeRepository(provider, raw) {
  if (provider === 'github') {
    return {
      provider,
      identity: raw.nameWithOwner,
      providerId: null,
      defaultBranch: raw.defaultBranchRef?.name ?? null,
      url: raw.url ?? null,
    };
  }
  if (provider === 'gitlab') {
    return {
      provider,
      identity: raw.path_with_namespace,
      providerId: raw.id == null ? null : String(raw.id),
      defaultBranch: raw.default_branch ?? null,
      url: raw.web_url ?? null,
    };
  }
  throw new Error(`Unsupported repository adapter: ${provider}`);
}

export function normalizeOpenChanges(provider, raw) {
  if (!Array.isArray(raw)) return [];
  if (provider === 'github') {
    return raw.map((pr) => ({
      provider,
      kind: 'pull-request',
      number: pr.number,
      title: pr.title,
      headRef: pr.head.ref,
      headSha: pr.head.sha,
      headRepository: pr.head.repo?.full_name ?? null,
      headRepositoryId: pr.head.repo?.id == null ? null : String(pr.head.repo.id),
      baseRef: pr.base.ref,
      draft: Boolean(pr.draft),
      url: pr.html_url,
    }));
  }
  if (provider === 'gitlab') {
    return raw.map((mr) => ({
      provider,
      kind: 'merge-request',
      number: mr.iid,
      title: mr.title,
      headRef: mr.source_branch,
      headSha: mr.sha ?? mr.diff_refs?.head_sha ?? null,
      headRepository: null,
      headRepositoryId: mr.source_project_id == null ? null : String(mr.source_project_id),
      baseRef: mr.target_branch,
      draft: Boolean(mr.draft ?? mr.work_in_progress),
      url: mr.web_url,
    }));
  }
  throw new Error(`Unsupported repository adapter: ${provider}`);
}

export function changeIdentity(change) {
  const repository = change.provider === 'github'
    ? change.headRepository
    : change.headRepositoryId ?? change.headRepository;
  if (!change.provider || !repository || !change.headSha) return null;
  return `${change.provider}:${repository}@${change.headSha}`;
}

export function parseRemoteIdentity(provider, remoteUrl) {
  if (!remoteUrl || typeof remoteUrl !== 'string') return null;
  const normalized = remoteUrl
    .trim()
    .replace(/^git@[^:]+:/, '')
    .replace(/^https?:\/\/[^/]+\//, '')
    .replace(/^ssh:\/\/git@[^/]+\//, '')
    .replace(/\.git$/, '')
    .replace(/^\/+|\/+$/g, '');
  if (!normalized || !normalized.includes('/')) return null;
  return { provider, identity: normalized };
}

function normalizedConclusion(value) {
  const text = `${value ?? ''}`.toLowerCase();
  if (['success', 'passed', 'pass'].includes(text)) return 'success';
  if (['failure', 'failed', 'error', 'canceled', 'cancelled'].includes(text)) return 'failure';
  return null;
}

export function normalizeCiChecks(provider, raw) {
  if (!Array.isArray(raw)) return [];
  if (provider === 'github-actions') {
    return raw.map((check) => {
      const statusValue = `${check.status ?? check.state ?? ''}`.toLowerCase();
      const completed = statusValue === 'completed' || ['success', 'failure', 'error'].includes(statusValue);
      return {
        provider,
        name: check.name ?? check.context,
        workflow: check.workflowName ?? null,
        status: completed ? 'completed' : 'pending',
        conclusion: normalizedConclusion(check.conclusion ?? check.state),
        url: check.detailsUrl ?? check.targetUrl ?? null,
      };
    });
  }
  if (provider === 'gitlab-ci') {
    return raw.map((job) => ({
      provider,
      name: job.name,
      workflow: job.stage ?? null,
      status: ['success', 'failed', 'canceled'].includes(`${job.status}`.toLowerCase())
        ? 'completed'
        : 'pending',
      conclusion: normalizedConclusion(job.status),
      url: job.web_url ?? null,
    }));
  }
  if (provider === 'external' || provider === 'none') return raw;
  throw new Error(`Unsupported CI adapter: ${provider}`);
}

export function createDeploymentIdentity({ provider, identity, environment, revision }) {
  if (!provider || !identity || !environment || !revision) {
    throw new Error('deployment identity requires provider, identity, environment, and revision');
  }
  return { provider, identity, environment, revision };
}

export function correlateOpenChange({ branch, headSha, repository, changes }) {
  const sameBranch = changes.filter((change) => change.headRef === branch);
  const sameRepository = sameBranch.filter((change) => {
    if (repository.providerId && change.headRepositoryId) {
      return repository.providerId === change.headRepositoryId;
    }
    return repository.identity === change.headRepository;
  });
  const exact = sameRepository.find((change) => change.headSha === headSha) ?? null;
  const mismatch = exact ? null : sameRepository[0] ?? null;
  return { exact, mismatch };
}

export const supportedRepositoryProviders = Object.freeze(Object.keys(ADAPTERS));
export const supportedCIProviders = Object.freeze(Object.keys(CI_ADAPTERS));
