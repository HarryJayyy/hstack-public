import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { createVerificationGuide } from '../lib/verification-guide.mjs';

const step = () => ({ procedure: 'run host check', expected: 'owned result', failureMeaning: 'missing result' });
function guide() {
  return {
    schemaVersion: 'hstack-verification-guide/v1', name: 'Local service', environment: 'isolated local',
    workingDirectory: '.', source: 'host tests', ownership: 'owned fixture IDs only',
    doctor: [step()], launch: [step()], cleanup: [step()],
    features: [{ id: 'delivery', claim: 'one effect', fixture: 'owned event', binding: 'worktree and config',
      drive: [step()], observe: [step()], negativeControl: [step()],
      invalidatesOn: ['code or fixture change'], limitations: ['no distributed proof'] }],
  };
}

test('generated guide remains draft for every feature and does not mutate input', () => {
  const input = guide();
  const before = structuredClone(input);
  const result = createVerificationGuide(input);
  assert.equal(result.executed, false);
  assert.equal(result.status, 'DRAFT');
  assert.deepEqual(result.features, [{ id: 'delivery', status: 'DRAFT' }]);
  assert.deepEqual(input, before);
  assert.match(result.markdown, /no procedures have been executed/);
});

test('guide rejects missing proof, ownership and unexpected readiness claims', () => {
  for (const key of ['ownership', 'environment', 'source']) {
    const input = guide(); delete input[key];
    assert.throws(() => createVerificationGuide(input), /non-empty text/);
  }
  for (const key of ['observe', 'negativeControl', 'invalidatesOn', 'limitations']) {
    const input = guide(); input.features[0][key] = [];
    assert.throws(() => createVerificationGuide(input), /requires at least one/);
  }
  const input = guide(); input.status = 'PASS';
  assert.throws(() => createVerificationGuide(input), /unsupported fields/);
});

test('feature IDs are unique and procedures cannot terminate their literal block', () => {
  const input = guide(); input.features.push(structuredClone(input.features[0]));
  assert.throws(() => createVerificationGuide(input), /duplicate feature/);
  input.features.pop(); input.doctor[0].procedure = '```\n# injected heading\n```';
  assert.match(createVerificationGuide(input).markdown, /````text\n```\n# injected heading\n```\n````/);
});

test('CLI formats from an unrelated directory without executing supplied commands or creating files', () => {
  const directory = mkdtempSync(`${tmpdir()}/hstack-guide-`);
  try {
    const input = guide();
    input.launch[0].procedure = `${process.execPath} -e "require('node:fs').writeFileSync('executed.txt','bad')"`;
    const result = spawnSync(process.execPath, [fileURLToPath(new URL('../bin/hstack.mjs', import.meta.url)), 'verification-guide'], {
      cwd: directory, input: JSON.stringify(input), encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).status, 'DRAFT');
    assert.equal(existsSync(`${directory}/executed.txt`), false);
    const rejected = spawnSync(process.execPath, [fileURLToPath(new URL('../bin/hstack.mjs', import.meta.url)), 'verification-guide', '--run'], {
      cwd: directory, input: JSON.stringify(input), encoding: 'utf8',
    });
    assert.equal(rejected.status, 2);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
