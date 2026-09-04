import { aggregateExitState, EXIT_STATES, exitCodeFor, isExitState } from './states.mjs';

function isIsoDate(value) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

export function evaluateFreshness({ observedAt, ttlSeconds, now = new Date() }) {
  if (!Number.isInteger(ttlSeconds) || ttlSeconds < 1) {
    throw new Error('ttlSeconds must be a positive integer');
  }
  if (!isIsoDate(observedAt)) {
    return {
      state: EXIT_STATES.UNKNOWN,
      observedAt: observedAt ?? null,
      ttlSeconds,
      expiresAt: null,
      reason: 'observation time unavailable',
    };
  }
  const expiresAt = new Date(Date.parse(observedAt) + ttlSeconds * 1000);
  const state = now.getTime() > expiresAt.getTime() ? EXIT_STATES.STALE : EXIT_STATES.PASS;
  return {
    state,
    observedAt,
    ttlSeconds,
    expiresAt: expiresAt.toISOString(),
    reason: state === EXIT_STATES.STALE ? 'evidence TTL expired' : null,
  };
}

export function createEvidenceEnvelope({
  subject,
  repository,
  revision,
  source,
  freshness,
  capabilities = {},
  findings = [],
  artifacts = [],
  deployment = null,
  invalidationTriggers = [],
  generatedAt = new Date().toISOString(),
}) {
  if (!subject || typeof subject !== 'string') throw new Error('subject is required');
  if (!repository?.identity || !repository?.provider || !repository?.remote) {
    throw new Error('repository provider, identity, and remote are required');
  }
  if (!revision?.headSha) throw new Error('revision.headSha is required');
  if (!isIsoDate(generatedAt)) throw new Error('generatedAt must be an ISO date');
  for (const finding of findings) {
    if (!isExitState(finding.state)) throw new Error(`Invalid finding state: ${finding.state}`);
  }
  const freshnessState = freshness?.state ?? EXIT_STATES.UNKNOWN;
  if (!isExitState(freshnessState)) throw new Error(`Invalid freshness state: ${freshnessState}`);
  const state = aggregateExitState([freshnessState, ...findings.map((finding) => finding.state)]);
  return {
    schemaVersion: 'hstack-evidence/v1',
    state,
    exitCode: exitCodeFor(state),
    generatedAt,
    subject,
    repository: {
      provider: repository.provider,
      identity: repository.identity,
      remote: repository.remote,
      remoteUrl: repository.remoteUrl ?? null,
      defaultBranch: repository.defaultBranch ?? null,
    },
    revision: {
      headSha: revision.headSha,
      branch: revision.branch ?? null,
      worktreeFingerprint: revision.worktreeFingerprint ?? null,
      dirty: revision.dirty ?? null,
    },
    source: source ?? { kind: 'local' },
    freshness: freshness ?? { state: EXIT_STATES.UNKNOWN },
    capabilities,
    findings,
    artifacts,
    deployment,
    invalidationTriggers: [...new Set(invalidationTriggers)],
  };
}

export function validateEvidenceEnvelope(envelope) {
  if (envelope?.schemaVersion !== 'hstack-evidence/v1') {
    throw new Error('evidence schemaVersion must be hstack-evidence/v1');
  }
  if (!isExitState(envelope.state)) throw new Error('evidence state is invalid');
  if (!isIsoDate(envelope.generatedAt)) throw new Error('evidence generatedAt is invalid');
  if (!envelope.subject) throw new Error('evidence subject is required');
  if (!envelope.repository?.provider || !envelope.repository?.identity || !envelope.repository?.remote) {
    throw new Error('evidence repository identity is incomplete');
  }
  if (!envelope.revision?.headSha) throw new Error('evidence revision.headSha is required');
  if (envelope.deployment && (!envelope.deployment.provider || !envelope.deployment.identity)) {
    throw new Error('evidence deployment requires provider and identity');
  }
  return envelope;
}
