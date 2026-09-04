#!/usr/bin/env node

import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG_PATH = resolve(ROOT, 'plugin-package.json');

function assertOutput(output) {
  const relativeOutput = relative(ROOT, output);
  if (!relativeOutput || relativeOutput.startsWith('..') || resolve(output) === ROOT) {
    throw new Error(`refusing unsafe plugin output path: ${output}`);
  }
}

function assertEntry(entry, output) {
  if (typeof entry !== 'string' || !entry || entry.includes('..')) {
    throw new Error(`unsafe plugin package entry: ${entry}`);
  }
  const source = resolve(ROOT, entry);
  const destination = resolve(output, entry);
  if (relative(ROOT, source).startsWith('..') || relative(output, destination).startsWith('..')) {
    throw new Error(`plugin package entry escapes its boundary: ${entry}`);
  }
  return { source, destination };
}

function runtimePackage(source, runtimeScripts) {
  const packageJson = JSON.parse(readFileSync(source, 'utf8'));
  packageJson.scripts = Object.fromEntries(
    runtimeScripts.map((name) => [name, `node bin/hstack.mjs ${name}`]),
  );
  return `${JSON.stringify(packageJson, null, 2)}\n`;
}

export function buildPluginPackage(outputOverride) {
  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
  if (config.schemaVersion !== 1 || !Array.isArray(config.include)) {
    throw new Error('plugin-package.json is invalid');
  }
  const output = resolve(ROOT, outputOverride ?? config.output);
  assertOutput(output);
  rmSync(output, { recursive: true, force: true });
  mkdirSync(output, { recursive: true });

  for (const entry of config.include) {
    const { source, destination } = assertEntry(entry, output);
    if (entry === 'package.json') {
      mkdirSync(dirname(destination), { recursive: true });
      writeFileSync(destination, runtimePackage(source, config.runtimeScripts));
    } else {
      mkdirSync(dirname(destination), { recursive: true });
      cpSync(source, destination, { recursive: true });
    }
  }
  return { output, entries: config.include.length };
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  const outputIndex = process.argv.indexOf('--output');
  if (outputIndex !== -1 && !process.argv[outputIndex + 1]) throw new Error('--output requires a path');
  const result = buildPluginPackage(outputIndex === -1 ? undefined : process.argv[outputIndex + 1]);
  console.log(`PASS: built lean HStack plugin at ${result.output} from ${result.entries} declared entries.`);
}
