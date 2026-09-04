#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateProfile } from '../lib/profile.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const EXPECTED_SKILLS = [
  'hstack-evidence',
  'hstack-host-profile',
  'hstack-impact',
  'hstack-invariants',
  'hstack-mode',
  'hstack-reconcile',
];

function check(condition, message) {
  if (!condition) errors.push(message);
}

const manifest = JSON.parse(readFileSync(resolve(ROOT, '.codex-plugin/plugin.json'), 'utf8'));
const packageJson = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'));
check(manifest.name === 'hstack', 'plugin name must be hstack');
check(/^\d+\.\d+\.\d+$/.test(manifest.version ?? ''), 'plugin version must be strict semver');
check(manifest.license === 'MIT', 'plugin manifest must declare the MIT license');
check(manifest.skills === './skills/', 'plugin skills path must be ./skills/');
check(packageJson.private === true, 'npm package publication must remain disabled');
check(packageJson.license === 'MIT', 'package.json must declare the MIT license');
check(packageJson.version === manifest.version, 'package and plugin versions must match');
check(!packageJson.dependencies, 'runtime dependencies require explicit review');
check(packageJson.bin?.hstack === './bin/hstack.mjs', 'package must expose the stable hstack CLI');
check(existsSync(resolve(ROOT, 'bin/hstack.mjs')), 'stable hstack CLI is missing');

const packageConfig = JSON.parse(readFileSync(resolve(ROOT, 'plugin-package.json'), 'utf8'));
check(packageConfig.schemaVersion === 1, 'plugin package schema version is invalid');
check(packageConfig.output === 'dist/hstack', 'plugin package output must be dist/hstack');
for (const required of ['.codex-plugin', 'bin', 'lib', 'profiles', 'schemas', 'skills']) {
  check(packageConfig.include?.includes(required), `plugin package is missing runtime entry ${required}`);
}
for (const developmentOnly of ['.github', 'tests', 'AGENTS.md', 'scripts/validate.mjs']) {
  check(!packageConfig.include?.includes(developmentOnly), `plugin package includes development-only ${developmentOnly}`);
}

const skillNames = readdirSync(resolve(ROOT, 'skills')).sort();
check(JSON.stringify(skillNames) === JSON.stringify(EXPECTED_SKILLS), 'skill set must remain the six composable controls');
for (const name of skillNames) {
  const path = resolve(ROOT, 'skills', name, 'SKILL.md');
  const text = readFileSync(path, 'utf8');
  check(text.startsWith('---\n'), `${name}: missing YAML frontmatter`);
  check(new RegExp(`^name: ${name}$`, 'm').test(text), `${name}: frontmatter name mismatch`);
  check(/^description: .+/m.test(text), `${name}: missing description`);
  check(!text.includes('[TODO:'), `${name}: unfinished TODO placeholder`);
  const agentPath = resolve(ROOT, 'skills', name, 'agents', 'openai.yaml');
  check(existsSync(agentPath), `${name}: missing agents/openai.yaml`);
  if (existsSync(agentPath)) {
    const agent = readFileSync(agentPath, 'utf8');
    check(/default_prompt:/.test(agent), `${name}: missing default prompt`);
    check(/allow_implicit_invocation: true/.test(agent), `${name}: implicit invocation is not enabled`);
  }
  for (const match of text.matchAll(/\]\((references\/[^)]+)\)/g)) {
    check(existsSync(resolve(ROOT, 'skills', name, match[1])), `${name}: broken reference ${match[1]}`);
  }
}

for (const name of readdirSync(resolve(ROOT, 'profiles')).filter((file) => file.endsWith('.json'))) {
  const path = resolve(ROOT, 'profiles', name);
  try {
    validateProfile(JSON.parse(readFileSync(path, 'utf8')), path);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
}

const evidenceSchema = JSON.parse(
  readFileSync(resolve(ROOT, 'schemas/evidence-envelope.schema.json'), 'utf8'),
);
check(evidenceSchema.$schema === 'https://json-schema.org/draft/2020-12/schema', 'evidence schema draft is invalid');
check(evidenceSchema.properties?.schemaVersion?.const === 'hstack-evidence/v1', 'evidence schema version is invalid');

const eventProofSchema = JSON.parse(
  readFileSync(resolve(ROOT, 'schemas/event-proof-receipt.schema.json'), 'utf8'),
);
check(eventProofSchema.$schema === 'https://json-schema.org/draft/2020-12/schema', 'event proof schema draft is invalid');
check(
  eventProofSchema.properties?.schemaVersion?.const === 'hstack-event-proof/v1',
  'event proof schema version is invalid',
);
check(existsSync(resolve(ROOT, 'lib/event-proof.mjs')), 'event proof semantic validator is missing');
check(existsSync(resolve(ROOT, 'tests/event-proof.test.mjs')), 'event proof validator tests are missing');

const readme = readFileSync(resolve(ROOT, 'README.md'), 'utf8');
for (const rule of [
  'A diagram is navigation, not runtime proof.',
  'An API or HTTP 200 response is insufficient without downstream observations.',
  'A test filename proves existence, not execution on the bound SHA and environment.',
  'A build proves construction, not business behavior.',
]) {
  check(readme.includes(rule), `README is missing non-proof rule: ${rule}`);
}

const workflow = readFileSync(resolve(ROOT, '.github/workflows/ci.yml'), 'utf8');
for (const line of workflow.split(/\r?\n/).filter((value) => value.includes('uses:'))) {
  check(/uses:\s+[^@]+@[0-9a-f]{40}(?:\s+#.*)?$/.test(line.trim()), `CI action is not SHA-pinned: ${line.trim()}`);
}

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join('\n'));
  process.exit(1);
}
console.log(`PASS: plugin, ${readdirSync(resolve(ROOT, 'skills')).length} skills, profiles, schemas, and documentation validated.`);
