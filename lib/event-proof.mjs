import { readFileSync } from 'node:fs';
import { aggregateExitState, EXIT_STATES, exitCodeFor, isExitState } from './states.mjs';
import { validateJsonSchema } from './json-schema.mjs';

export const EVENT_PROOF_SCHEMA_VERSION = 'hstack-event-proof/v1';

const EVENT_PROOF_SCHEMA = JSON.parse(
  readFileSync(new URL('../schemas/event-proof-receipt.schema.json', import.meta.url), 'utf8'),
);

export const REQUIRED_EVENT_PROOF_SCENARIOS = Object.freeze([
  'atomic-core',
  'async-delivery',
  'idempotency-replay',
  'concurrency',
  'wrong-role',
  'wrong-tenant',
  'partial-failure-recovery',
  'correction-reversal',
  'reconciliation',
]);

const SAFE_NEGATIVE_CONTROL_ENVIRONMENTS = new Set([
  'local-isolated',
  'ephemeral-test',
  'dedicated-test',
]);
const SHA256 = /^sha256:[0-9a-f]{64}$/;
const GIT_SHA = /^[0-9a-f]{40,64}$/;

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isIsoDate(value) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function createFinding(state, code, message, subject = null) {
  return { state, code, message, subject };
}

function addFinding(findings, state, code, message, subject = null) {
  findings.push(createFinding(state, code, message, subject));
}

function requireString(findings, value, subject) {
  if (!isNonEmptyString(value)) {
    addFinding(findings, EXIT_STATES.INCOMPLETE, 'REQUIRED_VALUE_MISSING', `${subject} is required`, subject);
    return false;
  }
  return true;
}

function requireIsoDate(findings, value, subject) {
  if (!requireString(findings, value, subject)) return false;
  if (!isIsoDate(value)) {
    addFinding(findings, EXIT_STATES.VIOLATION, 'INVALID_DATE', `${subject} must be an ISO date`, subject);
    return false;
  }
  return true;
}

function requireDigest(findings, value, subject) {
  if (!requireString(findings, value, subject)) return false;
  if (!SHA256.test(value)) {
    addFinding(findings, EXIT_STATES.VIOLATION, 'INVALID_DIGEST', `${subject} must be a sha256 digest`, subject);
    return false;
  }
  return true;
}

function findDuplicates(values) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}

function validateArtifactReferences(findings, artifactIds, artifacts, subject, { required = true } = {}) {
  if (!Array.isArray(artifactIds) || (required && artifactIds.length === 0)) {
    addFinding(
      findings,
      EXIT_STATES.INCOMPLETE,
      'ARTIFACT_REFERENCE_MISSING',
      `${subject} requires artifact evidence`,
      subject,
    );
    return;
  }
  for (const duplicate of findDuplicates(artifactIds)) {
    addFinding(
      findings,
      EXIT_STATES.VIOLATION,
      'DUPLICATE_ARTIFACT_REFERENCE',
      `${subject} repeats artifact ${duplicate}`,
      subject,
    );
  }
  for (const artifactId of artifactIds) {
    if (!artifacts.has(artifactId)) {
      addFinding(
        findings,
        EXIT_STATES.INCOMPLETE,
        'ARTIFACT_NOT_FOUND',
        `${subject} references unavailable artifact ${artifactId}`,
        subject,
      );
    }
  }
}

function validateArtifacts(receipt, findings) {
  const artifacts = new Map();
  for (const [index, artifact] of asArray(receipt.artifacts).entries()) {
    const subject = `artifacts[${index}]`;
    if (!isObject(artifact)) {
      addFinding(findings, EXIT_STATES.VIOLATION, 'INVALID_ARTIFACT', `${subject} must be an object`, subject);
      continue;
    }
    if (!requireString(findings, artifact.id, `${subject}.id`)) continue;
    if (artifacts.has(artifact.id)) {
      addFinding(
        findings,
        EXIT_STATES.VIOLATION,
        'DUPLICATE_ARTIFACT_ID',
        `artifact id ${artifact.id} is duplicated`,
        artifact.id,
      );
      continue;
    }
    artifacts.set(artifact.id, artifact);
    requireString(findings, artifact.kind, `${subject}.kind`);
    requireString(findings, artifact.locator, `${subject}.locator`);
    requireDigest(findings, artifact.digest, `${subject}.digest`);
    requireIsoDate(findings, artifact.capturedAt, `${subject}.capturedAt`);
    requireString(findings, artifact.producer?.name, `${subject}.producer.name`);
    requireString(findings, artifact.producer?.version, `${subject}.producer.version`);
    requireString(findings, artifact.producer?.identity, `${subject}.producer.identity`);
    if (!['public', 'internal', 'confidential', 'restricted'].includes(artifact.redaction?.classification)) {
      addFinding(
        findings,
        EXIT_STATES.VIOLATION,
        'INVALID_REDACTION_CLASSIFICATION',
        `${subject}.redaction.classification is invalid`,
        subject,
      );
    }
    if (typeof artifact.redaction?.applied !== 'boolean') {
      addFinding(
        findings,
        EXIT_STATES.INCOMPLETE,
        'REDACTION_STATUS_MISSING',
        `${subject}.redaction.applied is required`,
        subject,
      );
    }
  }
  if (artifacts.size === 0) {
    addFinding(findings, EXIT_STATES.INCOMPLETE, 'ARTIFACTS_MISSING', 'event proof requires artifacts', 'artifacts');
  }
  return artifacts;
}

function validateBinding(receipt, findings, artifacts) {
  requireIsoDate(findings, receipt.generatedAt, 'generatedAt');
  requireString(findings, receipt.subject, 'subject');
  requireString(findings, receipt.proofContract?.id, 'proofContract.id');
  requireString(findings, receipt.proofContract?.version, 'proofContract.version');
  if (!SAFE_NEGATIVE_CONTROL_ENVIRONMENTS.has(receipt.proofContract?.negativeControlEnvironmentClass)) {
    addFinding(
      findings,
      EXIT_STATES.VIOLATION,
      'UNSAFE_NEGATIVE_CONTROL_ENVIRONMENT',
      'proofContract.negativeControlEnvironmentClass must be an isolated test class',
      'proofContract.negativeControlEnvironmentClass',
    );
  }

  requireString(findings, receipt.repository?.provider, 'repository.provider');
  requireString(findings, receipt.repository?.identity, 'repository.identity');
  if (!requireString(findings, receipt.repository?.headSha, 'repository.headSha')) {
    // Missing exact SHA is incomplete; the format check is intentionally skipped.
  } else if (!GIT_SHA.test(receipt.repository.headSha)) {
    addFinding(
      findings,
      EXIT_STATES.VIOLATION,
      'INVALID_REPOSITORY_SHA',
      'repository.headSha must be a full hexadecimal Git SHA',
      'repository.headSha',
    );
  }
  if (typeof receipt.repository?.dirty !== 'boolean') {
    addFinding(findings, EXIT_STATES.INCOMPLETE, 'DIRTY_STATE_MISSING', 'repository.dirty is required', 'repository.dirty');
  }
  if (receipt.repository?.dirty === true && !isNonEmptyString(receipt.repository.worktreeFingerprint)) {
    addFinding(
      findings,
      EXIT_STATES.INCOMPLETE,
      'WORKTREE_FINGERPRINT_MISSING',
      'dirty repository evidence requires a worktree fingerprint',
      'repository.worktreeFingerprint',
    );
  }

  requireString(findings, receipt.runtime?.environment?.name, 'runtime.environment.name');
  requireString(findings, receipt.runtime?.environment?.class, 'runtime.environment.class');
  requireString(findings, receipt.runtime?.environment?.provider, 'runtime.environment.provider');
  requireIsoDate(findings, receipt.runtime?.observedAt, 'runtime.observedAt');
  requireString(findings, receipt.runtime?.fixture?.id, 'runtime.fixture.id');
  requireString(findings, receipt.runtime?.fixture?.version, 'runtime.fixture.version');

  const flags = receipt.runtime?.featureFlags;
  requireString(findings, flags?.source?.kind, 'runtime.featureFlags.source.kind');
  requireString(findings, flags?.source?.identity, 'runtime.featureFlags.source.identity');
  requireString(findings, flags?.evaluationContext?.subject, 'runtime.featureFlags.evaluationContext.subject');
  requireDigest(
    findings,
    flags?.evaluationContext?.attributesDigest,
    'runtime.featureFlags.evaluationContext.attributesDigest',
  );
  if (flags?.canonicalization !== 'RFC8785') {
    addFinding(
      findings,
      EXIT_STATES.VIOLATION,
      'INVALID_FLAG_CANONICALIZATION',
      'feature-flag evidence must use RFC8785 canonicalization',
      'runtime.featureFlags.canonicalization',
    );
  }
  requireDigest(findings, flags?.digest, 'runtime.featureFlags.digest');
  validateArtifactReferences(
    findings,
    flags?.artifactIds,
    artifacts,
    'runtime.featureFlags',
  );

  for (const field of ['definitionId', 'definitionVersion', 'eventId', 'correlationId', 'idempotencyKey']) {
    requireString(findings, receipt.event?.[field], `event.${field}`);
  }
  requireIsoDate(findings, receipt.event?.occurredAt, 'event.occurredAt');
  if (!Array.isArray(receipt.event?.policyRefs) || receipt.event.policyRefs.length === 0) {
    addFinding(
      findings,
      EXIT_STATES.INCOMPLETE,
      'POLICY_REFERENCE_MISSING',
      'event.policyRefs must identify authoritative policy',
      'event.policyRefs',
    );
  }
}

function validateStructure(receipt, findings) {
  for (const error of validateJsonSchema(receipt, EVENT_PROOF_SCHEMA)) {
    const state = error.keyword === 'required' ? EXIT_STATES.INCOMPLETE : EXIT_STATES.VIOLATION;
    addFinding(
      findings,
      state,
      `SCHEMA_${error.keyword.replaceAll(/([a-z])([A-Z])/g, '$1_$2').toUpperCase()}`,
      error.message,
      error.path,
    );
  }
}

function validateExpectedGraph(receipt, findings) {
  const reactions = asArray(receipt.expectedGraph?.reactions);
  const reactionsById = new Map();
  for (const [index, reaction] of reactions.entries()) {
    const subject = `expectedGraph.reactions[${index}]`;
    if (!isObject(reaction) || !requireString(findings, reaction?.id, `${subject}.id`)) continue;
    if (reactionsById.has(reaction.id)) {
      addFinding(
        findings,
        EXIT_STATES.VIOLATION,
        'DUPLICATE_EXPECTED_REACTION',
        `expected reaction ${reaction.id} is duplicated`,
        reaction.id,
      );
      continue;
    }
    reactionsById.set(reaction.id, reaction);
    requireString(findings, reaction.module, `${subject}.module`);
    requireString(findings, reaction.invariant, `${subject}.invariant`);
    requireString(findings, reaction.expectedEffect, `${subject}.expectedEffect`);
    if (typeof reaction.required !== 'boolean') {
      addFinding(findings, EXIT_STATES.INCOMPLETE, 'REACTION_REQUIREMENT_MISSING', `${subject}.required is required`, subject);
    }
    const minimum = reaction.cardinality?.min;
    const maximum = reaction.cardinality?.max;
    const minimumValid = Number.isInteger(minimum) && minimum >= 0;
    const maximumValid = maximum === null || (Number.isInteger(maximum) && maximum >= 0);
    if (!minimumValid || !maximumValid || (maximum !== null && maximum < minimum)) {
      addFinding(
        findings,
        EXIT_STATES.VIOLATION,
        'INVALID_CARDINALITY',
        `${reaction.id} has invalid cardinality`,
        reaction.id,
      );
    } else if (reaction.required && minimum < 1) {
      addFinding(
        findings,
        EXIT_STATES.VIOLATION,
        'INVALID_REQUIRED_CARDINALITY',
        `${reaction.id} is required but permits zero observations`,
        reaction.id,
      );
    }
    if (!Array.isArray(reaction.dependsOn)) {
      addFinding(findings, EXIT_STATES.INCOMPLETE, 'DEPENDENCIES_MISSING', `${subject}.dependsOn is required`, subject);
    }
    if (!['REQUIRED', 'NOT_APPLICABLE'].includes(reaction.readback?.requirement)) {
      addFinding(findings, EXIT_STATES.VIOLATION, 'INVALID_READBACK_REQUIREMENT', `${subject}.readback is invalid`, subject);
    }
    if (
      reaction.readback?.requirement === 'NOT_APPLICABLE'
      && !isNonEmptyString(reaction.readback.authorityRef)
    ) {
      addFinding(
        findings,
        EXIT_STATES.VIOLATION,
        'READBACK_AUTHORITY_MISSING',
        `${reaction.id} requires authority for NOT_APPLICABLE readback`,
        reaction.id,
      );
    }
  }
  if (reactionsById.size === 0) {
    addFinding(
      findings,
      EXIT_STATES.INCOMPLETE,
      'EXPECTED_GRAPH_MISSING',
      'expectedGraph must define at least one business reaction',
      'expectedGraph',
    );
  }

  for (const reaction of reactionsById.values()) {
    for (const dependency of asArray(reaction.dependsOn)) {
      if (!reactionsById.has(dependency)) {
        addFinding(
          findings,
          EXIT_STATES.VIOLATION,
          'UNKNOWN_REACTION_DEPENDENCY',
          `${reaction.id} depends on unknown reaction ${dependency}`,
          reaction.id,
        );
      }
    }
  }

  const visiting = new Set();
  const visited = new Set();
  let cycleReported = false;
  function visit(reactionId) {
    if (visiting.has(reactionId)) {
      if (!cycleReported) {
        addFinding(
          findings,
          EXIT_STATES.VIOLATION,
          'CYCLIC_REACTION_GRAPH',
          `expectedGraph contains a dependency cycle at ${reactionId}`,
          reactionId,
        );
        cycleReported = true;
      }
      return;
    }
    if (visited.has(reactionId)) return;
    visiting.add(reactionId);
    for (const dependency of asArray(reactionsById.get(reactionId)?.dependsOn)) {
      if (reactionsById.has(dependency)) visit(dependency);
    }
    visiting.delete(reactionId);
    visited.add(reactionId);
  }
  for (const reactionId of reactionsById.keys()) visit(reactionId);
  return reactionsById;
}

function validateImplementationGraph(receipt, findings, expected) {
  const mappings = asArray(receipt.implementationGraph?.mappings);
  const mappedExpected = new Map();
  const implementationIds = new Set();
  for (const [index, mapping] of mappings.entries()) {
    const subject = `implementationGraph.mappings[${index}]`;
    if (!isObject(mapping)) {
      addFinding(findings, EXIT_STATES.VIOLATION, 'INVALID_IMPLEMENTATION_MAPPING', `${subject} is invalid`, subject);
      continue;
    }
    if (!expected.has(mapping.expectedReactionId)) {
      addFinding(
        findings,
        EXIT_STATES.VIOLATION,
        'UNKNOWN_IMPLEMENTATION_REACTION',
        `${subject} maps unknown expected reaction ${mapping.expectedReactionId}`,
        subject,
      );
    }
    if (mappedExpected.has(mapping.expectedReactionId)) {
      addFinding(
        findings,
        EXIT_STATES.VIOLATION,
        'DUPLICATE_IMPLEMENTATION_MAPPING',
        `expected reaction ${mapping.expectedReactionId} has multiple implementation mappings`,
        mapping.expectedReactionId,
      );
    } else {
      mappedExpected.set(mapping.expectedReactionId, mapping);
    }
    if (!requireString(findings, mapping.implementationId, `${subject}.implementationId`)) continue;
    if (implementationIds.has(mapping.implementationId)) {
      addFinding(
        findings,
        EXIT_STATES.VIOLATION,
        'DUPLICATE_IMPLEMENTATION_ID',
        `implementation id ${mapping.implementationId} is duplicated`,
        mapping.implementationId,
      );
    }
    implementationIds.add(mapping.implementationId);
    if (!Array.isArray(mapping.sourceRefs) || mapping.sourceRefs.length === 0) {
      addFinding(findings, EXIT_STATES.INCOMPLETE, 'SOURCE_REFERENCE_MISSING', `${subject} requires sourceRefs`, subject);
    }
    requireString(findings, mapping.mechanism, `${subject}.mechanism`);
    requireString(findings, mapping.transactionBoundary, `${subject}.transactionBoundary`);
  }
  for (const reaction of expected.values()) {
    if (reaction.required && !mappedExpected.has(reaction.id)) {
      addFinding(
        findings,
        EXIT_STATES.INCOMPLETE,
        'IMPLEMENTATION_REACTION_MISSING',
        `required reaction ${reaction.id} has no implementation mapping`,
        reaction.id,
      );
    }
  }
}

function validateObservedGraph(receipt, findings, expected, artifacts) {
  const observations = asArray(receipt.observedGraph?.reactions);
  const observedByExpected = new Map();
  for (const [index, observation] of observations.entries()) {
    const subject = `observedGraph.reactions[${index}]`;
    if (!isObject(observation)) {
      addFinding(findings, EXIT_STATES.VIOLATION, 'INVALID_OBSERVED_REACTION', `${subject} is invalid`, subject);
      continue;
    }
    const reactionId = observation.expectedReactionId;
    if (!expected.has(reactionId)) {
      addFinding(
        findings,
        EXIT_STATES.VIOLATION,
        'UNKNOWN_OBSERVED_REACTION',
        `${subject} observes unknown reaction ${reactionId}`,
        subject,
      );
    }
    if (observedByExpected.has(reactionId)) {
      const prior = observedByExpected.get(reactionId);
      addFinding(
        findings,
        EXIT_STATES.VIOLATION,
        prior.state === observation.state ? 'DUPLICATE_OBSERVED_REACTION' : 'CONTRADICTORY_OBSERVED_REACTION',
        `expected reaction ${reactionId} has multiple observed results`,
        reactionId,
      );
    } else {
      observedByExpected.set(reactionId, observation);
    }
    if (!isExitState(observation.state)) {
      addFinding(findings, EXIT_STATES.VIOLATION, 'INVALID_OBSERVED_STATE', `${subject}.state is invalid`, subject);
    } else if (observation.state !== EXIT_STATES.PASS) {
      addFinding(
        findings,
        observation.state,
        'OBSERVED_REACTION_NOT_PASSING',
        `${reactionId} observation is ${observation.state}`,
        reactionId,
      );
    }
    if (!Number.isInteger(observation.observedCount) || observation.observedCount < 0) {
      addFinding(findings, EXIT_STATES.VIOLATION, 'INVALID_OBSERVED_COUNT', `${subject}.observedCount is invalid`, subject);
    }
    const reaction = expected.get(reactionId);
    if (reaction && observation.state === EXIT_STATES.PASS && Number.isInteger(observation.observedCount)) {
      const { min, max } = reaction.cardinality ?? {};
      if (observation.observedCount < min || (max !== null && observation.observedCount > max)) {
        addFinding(
          findings,
          EXIT_STATES.VIOLATION,
          'OBSERVED_CARDINALITY_MISMATCH',
          `${reactionId} observed ${observation.observedCount}, expected ${min}..${max ?? 'unbounded'}`,
          reactionId,
        );
      }
    }
    validateArtifactReferences(findings, observation.artifactIds, artifacts, subject);
  }
  for (const reaction of expected.values()) {
    if (reaction.required && !observedByExpected.has(reaction.id)) {
      addFinding(
        findings,
        EXIT_STATES.INCOMPLETE,
        'OBSERVED_REACTION_MISSING',
        `required reaction ${reaction.id} has no observed proof`,
        reaction.id,
      );
    }
  }
}

function validateSnapshot(snapshot, findings, artifacts, subject) {
  if (!isObject(snapshot)) {
    addFinding(findings, EXIT_STATES.INCOMPLETE, 'READBACK_SNAPSHOT_MISSING', `${subject} is required`, subject);
    return;
  }
  requireIsoDate(findings, snapshot.capturedAt, `${subject}.capturedAt`);
  requireDigest(findings, snapshot.selectorDigest, `${subject}.selectorDigest`);
  requireDigest(findings, snapshot.valueDigest, `${subject}.valueDigest`);
  if (!Number.isInteger(snapshot.rowCount) || snapshot.rowCount < 0) {
    addFinding(findings, EXIT_STATES.VIOLATION, 'INVALID_READBACK_ROW_COUNT', `${subject}.rowCount is invalid`, subject);
  }
  validateArtifactReferences(findings, snapshot.artifactIds, artifacts, subject);
}

function validateReadbacks(receipt, findings, expected, artifacts) {
  const readbacks = asArray(receipt.readbacks);
  const reactionsWithReadback = new Map();
  const readbackIds = new Set();
  for (const [index, readback] of readbacks.entries()) {
    const subject = `readbacks[${index}]`;
    if (!isObject(readback)) {
      addFinding(findings, EXIT_STATES.VIOLATION, 'INVALID_READBACK', `${subject} is invalid`, subject);
      continue;
    }
    if (!requireString(findings, readback.id, `${subject}.id`)) continue;
    if (readbackIds.has(readback.id)) {
      addFinding(findings, EXIT_STATES.VIOLATION, 'DUPLICATE_READBACK_ID', `${readback.id} is duplicated`, readback.id);
    }
    readbackIds.add(readback.id);
    if (!expected.has(readback.expectedReactionId)) {
      addFinding(
        findings,
        EXIT_STATES.VIOLATION,
        'UNKNOWN_READBACK_REACTION',
        `${subject} targets unknown reaction ${readback.expectedReactionId}`,
        subject,
      );
    }
    if (reactionsWithReadback.has(readback.expectedReactionId)) {
      addFinding(
        findings,
        EXIT_STATES.VIOLATION,
        'DUPLICATE_REACTION_READBACK',
        `${readback.expectedReactionId} has multiple readback pairs`,
        readback.expectedReactionId,
      );
    }
    reactionsWithReadback.set(readback.expectedReactionId, readback);
    requireString(findings, readback.store, `${subject}.store`);
    validateSnapshot(readback.before, findings, artifacts, `${subject}.before`);
    validateSnapshot(readback.after, findings, artifacts, `${subject}.after`);
  }
  for (const reaction of expected.values()) {
    if (reaction.readback?.requirement === 'REQUIRED' && !reactionsWithReadback.has(reaction.id)) {
      addFinding(
        findings,
        EXIT_STATES.INCOMPLETE,
        'REACTION_READBACK_MISSING',
        `${reaction.id} requires before/after readback`,
        reaction.id,
      );
    }
  }
}

function validateScenarios(receipt, findings, artifacts) {
  const proofsByKind = new Map();
  for (const [index, proof] of asArray(receipt.scenarioProofs).entries()) {
    const subject = `scenarioProofs[${index}]`;
    if (!isObject(proof) || !isNonEmptyString(proof.kind)) {
      addFinding(findings, EXIT_STATES.VIOLATION, 'INVALID_SCENARIO_PROOF', `${subject} is invalid`, subject);
      continue;
    }
    if (!REQUIRED_EVENT_PROOF_SCENARIOS.includes(proof.kind)) {
      addFinding(findings, EXIT_STATES.VIOLATION, 'UNKNOWN_SCENARIO_KIND', `${proof.kind} is unsupported`, proof.kind);
    }
    if (proofsByKind.has(proof.kind)) {
      addFinding(findings, EXIT_STATES.VIOLATION, 'DUPLICATE_SCENARIO_PROOF', `${proof.kind} is duplicated`, proof.kind);
    }
    proofsByKind.set(proof.kind, proof);
    if (proof.state === 'NOT_APPLICABLE') {
      if (!isNonEmptyString(proof.authorityRef)) {
        addFinding(
          findings,
          EXIT_STATES.VIOLATION,
          'SCENARIO_AUTHORITY_MISSING',
          `${proof.kind} requires authority for NOT_APPLICABLE`,
          proof.kind,
        );
      }
      validateArtifactReferences(findings, proof.artifactIds, artifacts, subject, { required: false });
    } else if (!isExitState(proof.state)) {
      addFinding(findings, EXIT_STATES.VIOLATION, 'INVALID_SCENARIO_STATE', `${proof.kind} state is invalid`, proof.kind);
    } else {
      if (proof.state !== EXIT_STATES.PASS) {
        addFinding(
          findings,
          proof.state,
          'SCENARIO_NOT_PASSING',
          `${proof.kind} is ${proof.state}`,
          proof.kind,
        );
      }
      validateArtifactReferences(findings, proof.artifactIds, artifacts, subject);
    }
  }
  for (const kind of REQUIRED_EVENT_PROOF_SCENARIOS) {
    if (!proofsByKind.has(kind)) {
      addFinding(
        findings,
        EXIT_STATES.INCOMPLETE,
        'SCENARIO_PROOF_MISSING',
        `required scenario ${kind} is missing`,
        kind,
      );
    }
  }
}

function validateNegativeControl(receipt, findings, artifacts) {
  const control = receipt.negativeControl;
  if (!isObject(control)) {
    addFinding(
      findings,
      EXIT_STATES.INCOMPLETE,
      'NEGATIVE_CONTROL_MISSING',
      'a safe reusable negative control is required',
      'negativeControl',
    );
    return;
  }
  if (control.testContractId !== receipt.proofContract?.id) {
    addFinding(findings, EXIT_STATES.VIOLATION, 'NEGATIVE_CONTROL_CONTRACT_MISMATCH', 'negative control contract id does not match', 'negativeControl');
  }
  if (control.testContractVersion !== receipt.proofContract?.version) {
    addFinding(findings, EXIT_STATES.VIOLATION, 'NEGATIVE_CONTROL_VERSION_MISMATCH', 'negative control contract version does not match', 'negativeControl');
  }
  if (control.repositorySha !== receipt.repository?.headSha) {
    addFinding(findings, EXIT_STATES.VIOLATION, 'NEGATIVE_CONTROL_SHA_MISMATCH', 'negative control is not bound to the receipt SHA', 'negativeControl');
  }
  if (control.environmentClass !== receipt.proofContract?.negativeControlEnvironmentClass) {
    addFinding(findings, EXIT_STATES.VIOLATION, 'NEGATIVE_CONTROL_ENVIRONMENT_MISMATCH', 'negative control environment class does not match its proof contract', 'negativeControl');
  }
  if (!SAFE_NEGATIVE_CONTROL_ENVIRONMENTS.has(control.environmentClass) || control.isolation !== 'isolated') {
    addFinding(
      findings,
      EXIT_STATES.VIOLATION,
      'UNSAFE_NEGATIVE_CONTROL',
      'negative controls must run in an isolated local, ephemeral, or dedicated test environment',
      'negativeControl',
    );
  }
  requireIsoDate(findings, control.executedAt, 'negativeControl.executedAt');
  if (!['removed', 'duplicated', 'miscalculated', 'unauthorized'].includes(control.mutation)) {
    addFinding(findings, EXIT_STATES.VIOLATION, 'INVALID_NEGATIVE_CONTROL_MUTATION', 'negative control mutation is invalid', 'negativeControl.mutation');
  }
  requireString(findings, control.expectedFailure, 'negativeControl.expectedFailure');
  requireString(findings, control.observedFailure?.code, 'negativeControl.observedFailure.code');
  if (control.state !== EXIT_STATES.PASS || control.observedFailure?.detected !== true) {
    addFinding(
      findings,
      EXIT_STATES.VIOLATION,
      'NEGATIVE_CONTROL_DID_NOT_FAIL',
      'negative control did not produce the expected failing observation',
      'negativeControl',
    );
  }
  validateArtifactReferences(findings, control.artifactIds, artifacts, 'negativeControl');
}

function validateCleanup(receipt, findings, artifacts) {
  const cleanup = receipt.cleanup;
  if (!isObject(cleanup)) {
    addFinding(findings, EXIT_STATES.INCOMPLETE, 'CLEANUP_MISSING', 'cleanup disposition is required', 'cleanup');
    return;
  }
  const owned = asArray(cleanup.ownedResourceIds);
  const absences = asArray(cleanup.absenceReadbacks);
  if (cleanup.state === 'NOT_APPLICABLE') {
    if (!isNonEmptyString(cleanup.authorityRef)) {
      addFinding(
        findings,
        EXIT_STATES.VIOLATION,
        'CLEANUP_AUTHORITY_MISSING',
        'NOT_APPLICABLE cleanup requires an authoritative reason',
        'cleanup.authorityRef',
      );
    }
    if (owned.length > 0 || absences.length > 0) {
      addFinding(
        findings,
        EXIT_STATES.VIOLATION,
        'CONTRADICTORY_CLEANUP',
        'NOT_APPLICABLE cleanup cannot also claim owned resources or absence readbacks',
        'cleanup',
      );
    }
    return;
  }
  if (cleanup.state !== EXIT_STATES.PASS) {
    addFinding(findings, EXIT_STATES.VIOLATION, 'INVALID_CLEANUP_STATE', 'cleanup state is invalid', 'cleanup.state');
    return;
  }
  if (owned.length === 0) {
    addFinding(
      findings,
      EXIT_STATES.INCOMPLETE,
      'OWNED_RESOURCE_IDS_MISSING',
      'cleanup PASS requires explicit owned resource ids',
      'cleanup.ownedResourceIds',
    );
  }
  for (const duplicate of findDuplicates(owned)) {
    addFinding(findings, EXIT_STATES.VIOLATION, 'DUPLICATE_OWNED_RESOURCE', `cleanup repeats ${duplicate}`, duplicate);
  }
  const absenceByResource = new Map();
  for (const [index, absence] of absences.entries()) {
    const subject = `cleanup.absenceReadbacks[${index}]`;
    if (!isObject(absence) || !requireString(findings, absence?.resourceId, `${subject}.resourceId`)) continue;
    if (absenceByResource.has(absence.resourceId)) {
      addFinding(
        findings,
        EXIT_STATES.VIOLATION,
        'DUPLICATE_CLEANUP_READBACK',
        `cleanup repeats absence readback for ${absence.resourceId}`,
        absence.resourceId,
      );
    }
    absenceByResource.set(absence.resourceId, absence);
    if (!owned.includes(absence.resourceId)) {
      addFinding(
        findings,
        EXIT_STATES.VIOLATION,
        'UNOWNED_CLEANUP_TARGET',
        `cleanup readback targets unowned resource ${absence.resourceId}`,
        absence.resourceId,
      );
    }
    requireString(findings, absence.store, `${subject}.store`);
    requireIsoDate(findings, absence.capturedAt, `${subject}.capturedAt`);
    requireDigest(findings, absence.selectorDigest, `${subject}.selectorDigest`);
    if (absence.rowCount !== 0) {
      addFinding(
        findings,
        EXIT_STATES.VIOLATION,
        'CLEANUP_ABSENCE_FAILED',
        `${absence.resourceId} remains after cleanup`,
        absence.resourceId,
      );
    }
    validateArtifactReferences(findings, absence.artifactIds, artifacts, subject);
  }
  for (const resourceId of owned) {
    if (!absenceByResource.has(resourceId)) {
      addFinding(
        findings,
        EXIT_STATES.INCOMPLETE,
        'CLEANUP_ABSENCE_READBACK_MISSING',
        `${resourceId} has no zero-row cleanup readback`,
        resourceId,
      );
    }
  }
}

export function evaluateEventProofReceipt(receipt) {
  if (!isObject(receipt)) throw new Error('event proof receipt must be an object');
  if (receipt.schemaVersion !== EVENT_PROOF_SCHEMA_VERSION) {
    throw new Error(`event proof schemaVersion must be ${EVENT_PROOF_SCHEMA_VERSION}`);
  }

  const findings = [];
  validateStructure(receipt, findings);
  const artifacts = validateArtifacts(receipt, findings);
  validateBinding(receipt, findings, artifacts);
  const expected = validateExpectedGraph(receipt, findings);
  validateImplementationGraph(receipt, findings, expected);
  validateObservedGraph(receipt, findings, expected, artifacts);
  validateReadbacks(receipt, findings, expected, artifacts);
  validateScenarios(receipt, findings, artifacts);
  validateNegativeControl(receipt, findings, artifacts);
  validateCleanup(receipt, findings, artifacts);

  if (!Array.isArray(receipt.invalidationTriggers) || receipt.invalidationTriggers.length === 0) {
    addFinding(
      findings,
      EXIT_STATES.INCOMPLETE,
      'INVALIDATION_TRIGGERS_MISSING',
      'event proof requires invalidation triggers',
      'invalidationTriggers',
    );
  }

  const state = aggregateExitState([
    findings.length === 0 ? EXIT_STATES.PASS : null,
    ...findings.map((finding) => finding.state),
  ]);
  return { state, exitCode: exitCodeFor(state), findings };
}

export function validateEventProofReceipt(receipt) {
  const evaluation = evaluateEventProofReceipt(receipt);
  if (!isExitState(receipt.state)) throw new Error('event proof declared state is invalid');
  if (receipt.state !== evaluation.state) {
    const codes = evaluation.findings.map((finding) => finding.code).join(', ');
    throw new Error(
      `event proof declared ${receipt.state} but derived ${evaluation.state}${codes ? `: ${codes}` : ''}`,
    );
  }
  if (receipt.exitCode !== evaluation.exitCode) {
    throw new Error(
      `event proof exitCode ${receipt.exitCode} does not match ${evaluation.state} (${evaluation.exitCode})`,
    );
  }
  return { receipt, evaluation };
}
