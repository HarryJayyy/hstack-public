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
    'profiles/generic.json',
    'schemas/event-proof-receipt.schema.json',
    'skills/hstack-mode/SKILL.md',
    'docs/MANUAL.md',
    'LICENSE',
  ]) {
    assert.equal(existsSync(resolve(output, path)), true, `${path} should be packaged`);
  }
  for (const path of ['.github', 'tests', 'AGENTS.md', 'SECURITY.md', 'docs/DESIGN-EVIDENCE.md', 'scripts/validate.mjs']) {
    assert.equal(existsSync(resolve(output, path)), false, `${path} should be excluded`);
  }

  const runtimePackage = JSON.parse(readFileSync(resolve(output, 'package.json'), 'utf8'));
  assert.equal(runtimePackage.bin.hstack, './bin/hstack.mjs');
  assert.equal(runtimePackage.scripts.test, undefined);
  assert.equal(runtimePackage.scripts.validate, undefined);
  assert.equal(runtimePackage.scripts['package:plugin'], undefined);

  const cli = spawnSync(process.execPath, [resolve(output, 'bin/hstack.mjs'), 'version'], {
    cwd: dirname(root), encoding: 'utf8',
  });
  assert.equal(cli.status, 0);
  assert.equal(cli.stdout.trim(), '0.4.1');
});
