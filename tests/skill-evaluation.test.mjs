import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, rmSync, existsSync, mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { scoreSkillEvaluation } from '../scripts/skill-evaluation.mjs';

const suite = JSON.parse(readFileSync(new URL('../evaluations/cases.json', import.meta.url), 'utf8'));
const bytes = Buffer.from('synthetic scorer fixture, not an agent run');
const digest = createHash('sha256').update(bytes).digest('hex');

test('authored behavioral cases have unique IDs and complete bounded critical criteria', () => {
  assert.equal(new Set(suite.cases.map(({ id }) => id)).size, suite.cases.length);
  for (const entry of suite.cases) {
    assert.ok(entry.prompt.trim());
    assert.ok(Object.keys(entry.files).length);
    assert.ok(entry.criteria.length > 0);
    assert.ok(entry.critical.every((index) => Number.isInteger(index) && index >= 0 && index < entry.criteria.length));
    assert.equal(new Set(entry.critical).size, entry.critical.length);
  }
});

function observations() {
  return { schemaVersion: 'hstack-behavior-observations/v1', runs: suite.cases.map((entry) => ({
    caseId: entry.id, variant: 'synthetic', codeBinding: 'fixture', agent: 'candidate', judge: 'reviewer',
    elapsedSeconds: 1, toolCalls: 2, artifacts: [{ id: 'trace', path: 'trace', sha256: digest }],
    criteria: entry.criteria.map(() => ({ met: true, reason: 'synthetic test annotation', artifactIds: ['trace'] })),
  })) };
}

test('no observations and missing cases are never complete evaluation', () => {
  const empty = { schemaVersion: 'hstack-behavior-observations/v1', runs: [] };
  assert.equal(scoreSkillEvaluation(suite, empty, () => bytes).assessment, 'NOT_RUN');
  const input = observations(); input.runs.pop();
  assert.equal(scoreSkillEvaluation(suite, input, () => bytes).assessment, 'INCOMPLETE');
});

test('critical failures are preserved separately from timing and satisfied criteria', () => {
  const input = observations(); input.runs[0].criteria[0].met = false;
  const result = scoreSkillEvaluation(suite, input, () => bytes);
  assert.equal(result.assessment, 'SCORED');
  assert.equal(result.runs[0].result, 'FAILED');
  assert.equal(result.variants[0].criticalFailures, 1);
  assert.equal(result.variants[0].elapsedSeconds, suite.cases.length);
  input.runs[0].criteria[0].met = null;
  assert.equal(scoreSkillEvaluation(suite, input, () => bytes).assessment, 'INCOMPLETE');
});

test('scoring rejects stale artifacts, missing citations, self-judgment and duplicate runs', () => {
  assert.throws(() => scoreSkillEvaluation(suite, observations(), () => Buffer.from('changed')), /artifact changed/);
  const input = observations(); input.runs[0].criteria[0].artifactIds = ['missing'];
  assert.throws(() => scoreSkillEvaluation(suite, input, () => bytes), /known artifact/);
  input.runs[0].criteria[0].artifactIds = ['trace']; input.runs[0].judge = 'candidate';
  assert.throws(() => scoreSkillEvaluation(suite, input, () => bytes), /independent/);
  input.runs[0].judge = 'reviewer'; input.runs.push(structuredClone(input.runs[0]));
  assert.throws(() => scoreSkillEvaluation(suite, input, () => bytes), /duplicate run/);
});

test('metrics reject impossible fractional tool counts', () => {
  const input = observations(); input.runs[0].toolCalls = 0.5;
  assert.throws(() => scoreSkillEvaluation(suite, input, () => bytes), /integer/);
});

test('CLI reports NOT_RUN without observations and refuses artifacts outside the declared root', () => {
  const script = fileURLToPath(new URL('../scripts/evaluate-skills.mjs', import.meta.url));
  const empty = spawnSync(process.execPath, [script], { encoding: 'utf8' });
  assert.equal(empty.status, 3);
  assert.match(empty.stdout, /NOT_RUN/);
  const directory = mkdtempSync(resolve(tmpdir(), 'hstack-observations-'));
  try {
    const input = observations();
    writeFileSync(resolve(directory, 'trace'), bytes);
    writeFileSync(resolve(directory, 'observations.json'), JSON.stringify(input));
    const scored = spawnSync(process.execPath, [script, '--input', resolve(directory, 'observations.json'), '--artifact-root', directory], { encoding: 'utf8' });
    assert.equal(scored.status, 0, scored.stderr);
    assert.equal(JSON.parse(scored.stdout).assessment, 'SCORED');
    input.runs[0].criteria[0].met = false;
    writeFileSync(resolve(directory, 'observations.json'), JSON.stringify(input));
    const failed = spawnSync(process.execPath, [script, '--input', resolve(directory, 'observations.json'), '--artifact-root', directory], { encoding: 'utf8' });
    assert.equal(failed.status, 2);
    input.runs[0].artifacts[0].path = '../trace';
    writeFileSync(resolve(directory, 'observations.json'), JSON.stringify(input));
    // Existing outside file makes this a containment check, not an ENOENT check.
    mkdirSync(resolve(directory, 'artifacts'));
    const escape = spawnSync(process.execPath, [script, '--input', resolve(directory, 'observations.json'), '--artifact-root', resolve(directory, 'artifacts')], { encoding: 'utf8' });
    assert.equal(escape.status, 2);
    assert.match(escape.stderr, /escapes declared root/);
    // Absolute paths are rejected before any attempted read.
    input.runs[0].artifacts[0].path = resolve(directory, 'trace');
    writeFileSync(resolve(directory, 'observations.json'), JSON.stringify(input));
    const absolute = spawnSync(process.execPath, [script, '--input', resolve(directory, 'observations.json'), '--artifact-root', directory], { encoding: 'utf8' });
    assert.equal(absolute.status, 2);
    assert.match(absolute.stderr, /must be relative/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('preparation creates an isolated organic task without rubric or deployment execution', () => {
  const result = spawnSync(process.execPath, [fileURLToPath(new URL('../scripts/evaluate-skills.mjs', import.meta.url)), '--prepare', 'deployment-boundary'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const prepared = JSON.parse(result.stdout);
  try {
    assert.equal(prepared.assessment, 'NOT_RUN');
    assert.equal(existsSync(`${prepared.workspace}/deployment-triggered.txt`), false);
    assert.equal(existsSync(`${prepared.workspace}/evaluations`), false);
    assert.equal(existsSync(`${prepared.workspace}/.instructions/skills/hstack-mode/SKILL.md`), true);
    assert.match(readFileSync(`${prepared.workspace}/TASK.md`, 'utf8'), /Do not push, merge, or deploy/);
  } finally { rmSync(prepared.workspace, { recursive: true, force: true }); }
});
