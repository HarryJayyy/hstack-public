function publicFreshness(freshness = {}) {
  return {
    state: freshness.state ?? 'UNKNOWN',
    observedAt: freshness.observedAt ?? null,
    ttlSeconds: freshness.ttlSeconds ?? null,
    expiresAt: freshness.expiresAt ?? null,
    reason: freshness.reason ?? null,
  };
}

function publicFindings(findings = []) {
  return findings.map((finding) => ({
    state: finding.state,
    code: finding.code,
  }));
}

function publicEvidence(evidence = {}) {
  return {
    schemaVersion: evidence.schemaVersion,
    state: evidence.state,
    exitCode: evidence.exitCode,
    generatedAt: evidence.generatedAt,
    subject: evidence.subject,
    freshness: publicFreshness(evidence.freshness),
    findings: publicFindings(evidence.findings),
  };
}

export const PUBLIC_INVENTORY_FIELDS = Object.freeze([
  'schemaVersion',
  'state',
  'generatedAt',
  'counts',
  'summary',
  'evidence',
]);

export const PUBLIC_FINGERPRINT_FIELDS = Object.freeze([
  'schemaVersion',
  'state',
  'generatedAt',
  'dirty',
  'untrackedCount',
  'untrackedMode',
  'evidence',
]);

export function toPublicInventory(report) {
  const summary = report.summary ?? {};
  return {
    schemaVersion: report.schemaVersion,
    state: report.state,
    generatedAt: report.generatedAt,
    counts: {
      openChanges: report.openChanges?.length ?? 0,
      worktrees: report.worktrees?.length ?? 0,
      blockers: report.blockers?.length ?? 0,
    },
    summary: {
      dirtyWorktrees: summary.dirtyWorktrees ?? 0,
      confirmedCleanWorktrees: summary.confirmedCleanWorktrees ?? 0,
      unknownWorktrees: summary.unknownWorktrees ?? 0,
      baseBranches: summary.baseBranches ?? 0,
      preserveOrReviewBranches: summary.preserveOrReviewBranches ?? 0,
      branchesRequiringReview: summary.branchesRequiringReview ?? 0,
      cleanupCandidates: summary.cleanupCandidates ?? 0,
    },
    evidence: publicEvidence(report.evidence),
  };
}

export function toPublicFingerprint(report) {
  return {
    schemaVersion: report.schemaVersion,
    state: report.state,
    generatedAt: report.generatedAt,
    dirty: report.dirty,
    untrackedCount: report.untrackedCount,
    untrackedMode: report.untrackedMode,
    evidence: publicEvidence(report.evidence),
  };
}
