import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { buildPluginPackage } from '../scripts/package-plugin.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'dist/hstack');

test('lean plugin package contains runtime files and excludes development files', (t) => {
  t.after(() => rmSync(resolve(root, 'dist'), { recursive: true, force: true }));
  const result = buildPluginPackage();
  assert.equal(result.output, output);

  for (const path of [
    '.codex-plugin/plugin.json',
    'bin/hstack.mjs',
    'scripts/execute.mjs',
    'lib/event-proof.mjs',
    'lib/verification-guide.mjs',
    'profiles/generic.json',
    'schemas/event-proof-receipt.schema.json',
    'skills/hstack-mode/SKILL.md',
    'skills/hstack-mode/references/engineering-workflows.md',
    'skills/hstack-evidence/references/verification-guides.md',
    'skills/hstack-evidence/references/adaptive-verification.md',
    'skills/hstack-impact/references/gap-discovery.md',
    'docs/MANUAL.md',
    'LICENSE',
  ]) {
    assert.equal(existsSync(resolve(output, path)), true, `${path} should be packaged`);
  }
  for (const path of ['.github', 'tests', 'evaluations', 'AGENTS.md', 'SECURITY.md', 'docs/DESIGN-EVIDENCE.md', 'scripts/validate.mjs', 'scripts/evaluate-skills.mjs', 'scripts/skill-evaluation.mjs']) {
    assert.equal(existsSync(resolve(output, path)), false, `${path} should be excluded`);
  }

  const runtimePackage = JSON.parse(readFileSync(resolve(output, 'package.json'), 'utf8'));
  assert.equal(runtimePackage.bin.hstack, './bin/hstack.mjs');
  assert.equal(runtimePackage.scripts.test, undefined);
  assert.equal(runtimePackage.scripts.validate, undefined);
  assert.equal(runtimePackage.scripts['package:plugin'], undefined);
  assert.equal(runtimePackage.scripts['eval:skills'], undefined);
  assert.equal(runtimePackage.scripts['verification-guide'], 'node bin/hstack.mjs verification-guide');

  const cli = spawnSync(process.execPath, [resolve(output, 'bin/hstack.mjs'), 'version'], {
    cwd: dirname(root), encoding: 'utf8',
  });
  assert.equal(cli.status, 0);
  assert.equal(cli.stdout.trim(), '0.4.1');
  const guideHelp = spawnSync(process.execPath, [resolve(output, 'bin/hstack.mjs'), 'verification-guide', '--help'], {
    cwd: dirname(root), encoding: 'utf8',
  });
  assert.equal(guideHelp.status, 0, guideHelp.stderr);
  assert.match(guideHelp.stdout, /never writes files or runs procedures/);
});
