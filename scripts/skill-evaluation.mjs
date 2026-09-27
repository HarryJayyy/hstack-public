import { createHash } from 'node:crypto';

export function scoreSkillEvaluation(suite, input, readArtifact) {
  if (input.schemaVersion !== 'hstack-behavior-observations/v1' || !Array.isArray(input.runs)) {
    throw new Error('expected hstack-behavior-observations/v1 with runs');
  }
  const identities = new Set();
  const cases = new Map(suite.cases.map((entry) => [entry.id, entry]));
  const runs = input.runs.map((run) => {
    const entry = cases.get(run.caseId);
    if (!entry) throw new Error(`unknown case: ${run.caseId}`);
    for (const key of ['variant', 'codeBinding', 'agent', 'judge']) {
      if (typeof run[key] !== 'string' || !run[key].trim()) throw new Error(`${key} is required`);
    }
    if (run.judge === run.agent) throw new Error('judge must be independent of the candidate agent');
    const identity = `${run.variant}:${run.caseId}`;
    if (identities.has(identity)) throw new Error(`duplicate run: ${identity}`);
    identities.add(identity);
    for (const key of ['elapsedSeconds', 'toolCalls']) {
      if (!Number.isFinite(run[key]) || run[key] < 0) throw new Error(`${key} must be non-negative`);
    }
    if (!Number.isInteger(run.toolCalls)) throw new Error('toolCalls must be an integer');
    if (!Array.isArray(run.artifacts) || !run.artifacts.length) throw new Error('artifacts are required');
    const artifacts = new Map();
    for (const artifact of run.artifacts) {
      if (typeof artifact.id !== 'string' || !artifact.id || artifacts.has(artifact.id)) throw new Error('artifact IDs must be unique');
      if (typeof artifact.path !== 'string' || !artifact.path || !/^[a-f0-9]{64}$/.test(artifact.sha256)) {
        throw new Error('artifact path and sha256 are required');
      }
      const digest = createHash('sha256').update(readArtifact(artifact.path)).digest('hex');
      if (digest !== artifact.sha256) throw new Error(`artifact changed: ${artifact.id}`);
      artifacts.set(artifact.id, artifact);
    }
    if (!Array.isArray(run.criteria) || run.criteria.length !== entry.criteria.length) throw new Error('every criterion requires a judgment');
    run.criteria.forEach((criterion, index) => {
      if (![true, false, null].includes(criterion.met)) throw new Error('criterion met must be true, false or null');
      if (typeof criterion.reason !== 'string' || !criterion.reason.trim()) throw new Error('criterion reason is required');
      if (!Array.isArray(criterion.artifactIds) || !criterion.artifactIds.length || criterion.artifactIds.some((id) => !artifacts.has(id))) {
        throw new Error(`criterion ${index} requires known artifact citations`);
      }
    });
    const unmet = run.criteria.filter(({ met }) => met === false).length;
    const unknown = run.criteria.filter(({ met }) => met === null).length;
    const criticalFailures = entry.critical.filter((index) => run.criteria[index].met === false).length;
    return {
      caseId: run.caseId, variant: run.variant, codeBinding: run.codeBinding,
      result: unmet ? 'FAILED' : unknown ? 'UNASSESSED' : 'SATISFIED',
      satisfied: run.criteria.filter(({ met }) => met === true).length,
      criteria: entry.criteria.length, criticalFailures, elapsedSeconds: run.elapsedSeconds, toolCalls: run.toolCalls,
    };
  });
  const variants = [...new Set(runs.map(({ variant }) => variant))].map((variant) => {
    const selected = runs.filter((run) => run.variant === variant);
    return {
      variant,
      missingCases: suite.cases.filter((entry) => !selected.some((run) => run.caseId === entry.id)).map(({ id }) => id),
      satisfiedRuns: selected.filter(({ result }) => result === 'SATISFIED').length,
      criticalFailures: selected.reduce((sum, run) => sum + run.criticalFailures, 0),
      elapsedSeconds: selected.reduce((sum, run) => sum + run.elapsedSeconds, 0),
      toolCalls: selected.reduce((sum, run) => sum + run.toolCalls, 0),
    };
  });
  return {
    schemaVersion: 'hstack-behavior-report/v1',
    assessment: !runs.length ? 'NOT_RUN' : variants.some(({ missingCases }) => missingCases.length) || runs.some(({ result }) => result === 'UNASSESSED') ? 'INCOMPLETE' : 'SCORED',
    basis: 'independent annotated observations; hashes bind artifacts, not judgment correctness',
    runs, variants,
  };
}
