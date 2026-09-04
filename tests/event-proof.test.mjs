import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateEventProofReceipt,
  REQUIRED_EVENT_PROOF_SCENARIOS,
  validateEventProofReceipt,
} from '../lib/event-proof.mjs';

const SHA = '621ac431cd4730d1dbe9f0e4c7ab6b33f33ca426';
const DIGEST_A = `sha256:${'a'.repeat(64)}`;
const DIGEST_B = `sha256:${'b'.repeat(64)}`;

function artifact(id) {
  return {
    id,
    kind: 'structured-test-output',
    locator: `artifacts/${id}.json`,
    digest: DIGEST_A,
    capturedAt: '2026-08-30T07:00:00.000Z',
    producer: { name: 'node-test', version: '22.0.0', identity: 'hstack-event-proof-tests' },
    redaction: { classification: 'internal', applied: true },
  };
}

function snapshot(rowCount, valueDigest = DIGEST_A) {
  return {
    capturedAt: '2026-08-30T07:00:00.000Z',
    selectorDigest: DIGEST_B,
    rowCount,
    valueDigest,
    artifactIds: ['event-run'],
  };
}

function validReceipt() {
  return {
    schemaVersion: 'hstack-event-proof/v1',
    state: 'PASS',
    exitCode: 0,
    generatedAt: '2026-08-30T07:10:00.000Z',
    subject: 'service completion cross-module proof',
    proofContract: {
      id: 'service-completion-proof',
      version: '1.0.0',
      negativeControlEnvironmentClass: 'ephemeral-test',
    },
    repository: {
      provider: 'github',
      identity: 'owner/project',
      headSha: SHA,
      dirty: false,
      worktreeFingerprint: null,
    },
    runtime: {
      environment: {
        name: 'staging-observation',
        class: 'staging',
        provider: 'example-runtime',
        deploymentIdentity: 'deployment-123',
      },
      observedAt: '2026-08-30T07:05:00.000Z',
      fixture: { id: 'fixture-service-001', version: '1' },
      featureFlags: {
        source: { kind: 'database', identity: 'feature-flags', revision: '42' },
        evaluationContext: {
          subject: 'actor-001',
          tenant: 'tenant-001',
          attributesDigest: DIGEST_A,
        },
        canonicalization: 'RFC8785',
        digest: DIGEST_B,
        artifactIds: ['flag-evaluation'],
      },
    },
    event: {
      definitionId: 'service-completed',
      definitionVersion: '1',
      eventId: 'event-001',
      correlationId: 'correlation-001',
      idempotencyKey: 'idempotency-001',
      occurredAt: '2026-08-30T07:01:00.000Z',
      policyRefs: ['policy://service-completion/v1'],
    },
    expectedGraph: {
      reactions: [
        {
          id: 'invoice',
          module: 'billing',
          mode: 'atomic',
          required: true,
          invariant: 'one final invoice belongs to the completed service',
          expectedEffect: 'create exactly one final invoice for the service total',
          dependsOn: [],
          cardinality: { min: 1, max: 1 },
          readback: { requirement: 'REQUIRED', authorityRef: null },
        },
        {
          id: 'ledger',
          module: 'accounting',
          mode: 'atomic',
          required: true,
          invariant: 'debits and credits balance for the invoice',
          expectedEffect: 'create exactly two balanced ledger lines',
          dependsOn: ['invoice'],
          cardinality: { min: 2, max: 2 },
          readback: { requirement: 'REQUIRED', authorityRef: null },
        },
        {
          id: 'notification',
          module: 'notifications',
          mode: 'outbox',
          required: true,
          invariant: 'the customer is notified at most once per event',
          expectedEffect: 'enqueue exactly one customer notification',
          dependsOn: ['invoice'],
          cardinality: { min: 1, max: 1 },
          readback: { requirement: 'NOT_APPLICABLE', authorityRef: 'policy://notification-proof/v1' },
        },
      ],
    },
    implementationGraph: {
      mappings: [
        {
          expectedReactionId: 'invoice',
          implementationId: 'invoice-command',
          sourceRefs: ['src/invoice.mjs:10'],
          mechanism: 'database insert',
          transactionBoundary: 'service transaction',
        },
        {
          expectedReactionId: 'ledger',
          implementationId: 'ledger-command',
          sourceRefs: ['src/ledger.mjs:20'],
          mechanism: 'database insert',
          transactionBoundary: 'service transaction',
        },
        {
          expectedReactionId: 'notification',
          implementationId: 'notification-outbox',
          sourceRefs: ['src/outbox.mjs:30'],
          mechanism: 'transactional outbox',
          transactionBoundary: 'service transaction then worker delivery',
        },
      ],
    },
    observedGraph: {
      reactions: [
        { expectedReactionId: 'invoice', state: 'PASS', observedCount: 1, artifactIds: ['event-run'] },
        { expectedReactionId: 'ledger', state: 'PASS', observedCount: 2, artifactIds: ['event-run'] },
        { expectedReactionId: 'notification', state: 'PASS', observedCount: 1, artifactIds: ['event-run'] },
      ],
    },
    readbacks: [
      {
        id: 'invoice-readback',
        expectedReactionId: 'invoice',
        store: 'database',
        before: snapshot(0),
        after: snapshot(1, DIGEST_B),
      },
      {
        id: 'ledger-readback',
        expectedReactionId: 'ledger',
        store: 'database',
        before: snapshot(0),
        after: snapshot(2, DIGEST_B),
      },
    ],
    scenarioProofs: REQUIRED_EVENT_PROOF_SCENARIOS.map((kind) => ({
      kind,
      state: 'PASS',
      authorityRef: null,
      artifactIds: ['event-run'],
    })),
    artifacts: [artifact('event-run'), artifact('flag-evaluation'), artifact('negative-control')],
    negativeControl: {
      state: 'PASS',
      testContractId: 'service-completion-proof',
      testContractVersion: '1.0.0',
      repositorySha: SHA,
      environmentClass: 'ephemeral-test',
      isolation: 'isolated',
      executedAt: '2026-08-29T07:00:00.000Z',
      mutation: 'duplicated',
      expectedFailure: 'duplicate notification is detected',
      observedFailure: { detected: true, code: 'DUPLICATE_REACTION' },
      artifactIds: ['negative-control'],
    },
    cleanup: {
      state: 'PASS',
      authorityRef: null,
      ownedResourceIds: ['fixture-service-001'],
      absenceReadbacks: [
        {
          resourceId: 'fixture-service-001',
          store: 'database',
          capturedAt: '2026-08-30T07:09:00.000Z',
          selectorDigest: DIGEST_A,
          rowCount: 0,
          artifactIds: ['event-run'],
        },
      ],
    },
    invalidationTriggers: [
      'repository-sha-changed',
      'proof-contract-changed',
      'environment-changed',
      'feature-flags-changed',
    ],
  };
}

function expectFalsePass(receipt, pattern) {
  assert.throws(() => validateEventProofReceipt(receipt), pattern);
}

test('complete event proof derives PASS', () => {
  const receipt = validReceipt();
  const { evaluation } = validateEventProofReceipt(receipt);
  assert.equal(evaluation.state, 'PASS');
  assert.equal(evaluation.exitCode, 0);
  assert.deepEqual(evaluation.findings, []);
});

test('missing observed reaction cannot claim PASS', () => {
  const receipt = validReceipt();
  receipt.observedGraph.reactions.pop();
  expectFalsePass(receipt, /derived INCOMPLETE: OBSERVED_REACTION_MISSING/);
});

test('duplicate implementation mapping cannot claim PASS', () => {
  const receipt = validReceipt();
  receipt.implementationGraph.mappings.push({
    ...receipt.implementationGraph.mappings[0],
    implementationId: 'second-invoice-command',
  });
  expectFalsePass(receipt, /derived VIOLATION: DUPLICATE_IMPLEMENTATION_MAPPING/);
});

test('cyclic expected dependencies cannot claim PASS', () => {
  const receipt = validReceipt();
  receipt.expectedGraph.reactions[0].dependsOn = ['ledger'];
  expectFalsePass(receipt, /CYCLIC_REACTION_GRAPH/);
});

test('contradictory observations cannot claim PASS', () => {
  const receipt = validReceipt();
  receipt.observedGraph.reactions.push({
    expectedReactionId: 'invoice',
    state: 'VIOLATION',
    observedCount: 0,
    artifactIds: ['event-run'],
  });
  expectFalsePass(receipt, /CONTRADICTORY_OBSERVED_REACTION/);
});

test('invalid and exceeded cardinality cannot claim PASS', async (t) => {
  await t.test('expected minimum exceeds maximum', () => {
    const receipt = validReceipt();
    receipt.expectedGraph.reactions[0].cardinality = { min: 2, max: 1 };
    expectFalsePass(receipt, /INVALID_CARDINALITY/);
  });
  await t.test('observed count exceeds maximum', () => {
    const receipt = validReceipt();
    receipt.observedGraph.reactions[0].observedCount = 2;
    expectFalsePass(receipt, /OBSERVED_CARDINALITY_MISMATCH/);
  });
});

test('exact state and event identity fields are mandatory', async (t) => {
  const cases = [
    ['repository SHA', (receipt) => { receipt.repository.headSha = ''; }, /REQUIRED_VALUE_MISSING/],
    ['environment', (receipt) => { receipt.runtime.environment.name = ''; }, /REQUIRED_VALUE_MISSING/],
    ['feature flags', (receipt) => { receipt.runtime.featureFlags.digest = ''; }, /REQUIRED_VALUE_MISSING/],
    ['correlation id', (receipt) => { receipt.event.correlationId = ''; }, /REQUIRED_VALUE_MISSING/],
    ['idempotency key', (receipt) => { receipt.event.idempotencyKey = ''; }, /REQUIRED_VALUE_MISSING/],
  ];
  for (const [name, mutate, pattern] of cases) {
    await t.test(name, () => {
      const receipt = validReceipt();
      mutate(receipt);
      expectFalsePass(receipt, pattern);
    });
  }
});

test('structural schema constraints cannot be bypassed by the semantic validator', async (t) => {
  const cases = [
    ['repository provider', (receipt) => { receipt.repository.provider = 'unsupported'; }, /SCHEMA_ENUM/],
    ['environment class', (receipt) => { receipt.runtime.environment.class = 'preview'; }, /SCHEMA_ENUM/],
    ['reaction mode', (receipt) => { receipt.expectedGraph.reactions[0].mode = 'eventually'; }, /SCHEMA_ENUM/],
    ['deployment identity presence', (receipt) => { delete receipt.runtime.environment.deploymentIdentity; }, /SCHEMA_REQUIRED/],
    ['unknown top-level field', (receipt) => { receipt.untrustedClaim = true; }, /SCHEMA_ADDITIONAL_PROPERTIES/],
  ];
  for (const [name, mutate, pattern] of cases) {
    await t.test(name, () => {
      const receipt = validReceipt();
      mutate(receipt);
      expectFalsePass(receipt, pattern);
    });
  }
});

test('required before and after readback cannot be omitted', () => {
  const receipt = validReceipt();
  receipt.readbacks = receipt.readbacks.filter((readback) => readback.expectedReactionId !== 'ledger');
  expectFalsePass(receipt, /REACTION_READBACK_MISSING/);
});

test('artifact provenance, digest, capture time, and redaction are enforced', async (t) => {
  const cases = [
    ['producer identity', (receipt) => { receipt.artifacts[0].producer.identity = ''; }],
    ['digest', (receipt) => { receipt.artifacts[0].digest = 'not-a-digest'; }],
    ['capture time', (receipt) => { receipt.artifacts[0].capturedAt = 'not-a-date'; }],
    ['redaction classification', (receipt) => { receipt.artifacts[0].redaction.classification = 'secret-ish'; }],
  ];
  for (const [name, mutate] of cases) {
    await t.test(name, () => {
      const receipt = validReceipt();
      mutate(receipt);
      expectFalsePass(receipt, /derived (INCOMPLETE|VIOLATION)/);
    });
  }
});

test('cleanup may be NOT_APPLICABLE for authoritative read-only proof', () => {
  const receipt = validReceipt();
  receipt.cleanup = {
    state: 'NOT_APPLICABLE',
    authorityRef: 'procedure://read-only-production-verification/v1',
    ownedResourceIds: [],
    absenceReadbacks: [],
  };
  assert.equal(validateEventProofReceipt(receipt).evaluation.state, 'PASS');
});

test('cleanup NOT_APPLICABLE requires authority and cannot contradict itself', async (t) => {
  await t.test('missing authority', () => {
    const receipt = validReceipt();
    receipt.cleanup = {
      state: 'NOT_APPLICABLE', authorityRef: null, ownedResourceIds: [], absenceReadbacks: [],
    };
    expectFalsePass(receipt, /CLEANUP_AUTHORITY_MISSING/);
  });
  await t.test('owned resources still declared', () => {
    const receipt = validReceipt();
    receipt.cleanup = {
      state: 'NOT_APPLICABLE',
      authorityRef: 'procedure://read-only/v1',
      ownedResourceIds: ['fixture-service-001'],
      absenceReadbacks: [],
    };
    expectFalsePass(receipt, /CONTRADICTORY_CLEANUP/);
  });
});

test('negative control is reusable only under its exact safe binding', async (t) => {
  await t.test('an earlier control at the same contract, SHA, and environment class is accepted', () => {
    const receipt = validReceipt();
    assert.equal(evaluateEventProofReceipt(receipt).state, 'PASS');
  });
  await t.test('different SHA is rejected', () => {
    const receipt = validReceipt();
    receipt.negativeControl.repositorySha = 'a'.repeat(40);
    expectFalsePass(receipt, /NEGATIVE_CONTROL_SHA_MISMATCH/);
  });
  await t.test('staging or production mutation is never accepted as the negative control', () => {
    const receipt = validReceipt();
    receipt.negativeControl.environmentClass = 'production';
    expectFalsePass(receipt, /NEGATIVE_CONTROL_ENVIRONMENT_MISMATCH, UNSAFE_NEGATIVE_CONTROL/);
  });
  await t.test('mutation must actually trigger the expected failure', () => {
    const receipt = validReceipt();
    receipt.negativeControl.observedFailure.detected = false;
    expectFalsePass(receipt, /NEGATIVE_CONTROL_DID_NOT_FAIL/);
  });
});
