#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadProfile } from '../lib/profile.mjs';
import { evaluateExecutionTask } from '../lib/routing.mjs';
import { exitCodeFor } from '../lib/states.mjs';

function valueAfter(args, flag) {
  const index = args.indexOf(flag);
  return index === -1 ? undefined : args[index + 1];
}

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log('Usage: hstack execute [--task execution.json] [--profile path]');
  console.log('       Reads structured JSON from stdin when --task is omitted.');
  console.log('       Free-text request fields are rejected; sourceRequestDigest is traceability only.');
  process.exit(0);
}
const valuedFlags = new Set(['--task', '--profile']);
for (let index = 0; index < args.length; index += 1) {
  const argument = args[index];
  if (!valuedFlags.has(argument)) throw new Error(`unknown execute option: ${argument}`);
  const value = args[index + 1];
  if (!value || value.startsWith('-')) throw new Error(`${argument} requires a value`);
  index += 1;
}

const taskPath = valueAfter(args, '--task');
const input = taskPath
  ? readFileSync(resolve(process.cwd(), taskPath), 'utf8')
  : readFileSync(0, 'utf8');
const task = JSON.parse(input);
const { profile, source } = loadProfile({ explicitPath: valueAfter(args, '--profile') });
const execution = evaluateExecutionTask(task, profile);
console.log(JSON.stringify({ profileSource: source, execution }, null, 2));
process.exitCode = exitCodeFor(execution.state);
