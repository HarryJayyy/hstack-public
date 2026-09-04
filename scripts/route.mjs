#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { loadProfile } from '../lib/profile.mjs';
import { routeTask } from '../lib/routing.mjs';
import { exitCodeFor } from '../lib/states.mjs';

const VALUED_FLAGS = new Set([
  '--task', '--text', '--paths', '--profile', '--intent', '--operations', '--capabilities',
  '--authorized', '--lane', '--active-owner', '--active-worktree', '--active-lane',
]);

function valueAfter(args, flag) {
  const index = args.indexOf(flag);
  return index === -1 ? undefined : args[index + 1];
}

function valuesAfter(args, flag) {
  const values = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === flag) {
      const value = args[index + 1];
      if (!value || value.startsWith('-')) throw new Error(`${flag} requires a value`);
      values.push(value);
      index += 1;
    }
  }
  return values;
}

function positionalArgs(args) {
  const values = [];
  for (let index = 0; index < args.length; index += 1) {
    if (VALUED_FLAGS.has(args[index])) index += 1;
    else if (!args[index].startsWith('-')) values.push(args[index]);
  }
  return values;
}

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log('Usage: hstack route --text <request> [--paths a,b] [--profile path]');
  console.log('       [--operations inspect|modify-repository,...]');
  console.log('       Advisory classification only; this command never grants execution readiness.');
  console.log('       [--intent read|mutate] [--capabilities edit,push] (legacy inputs)');
  console.log('       [--lane database]');
  console.log('       [--active-owner 0] [--active-worktree 0] [--active-lane 0]');
  console.log('   or: hstack route --task task.json [--profile path]');
  process.exit(0);
}
for (let index = 0; index < args.length; index += 1) {
  const argument = args[index];
  if (argument.startsWith('-') && !VALUED_FLAGS.has(argument)) {
    throw new Error(`unknown route option: ${argument}`);
  }
  if (VALUED_FLAGS.has(argument)) {
    const value = args[index + 1];
    if (!value || value.startsWith('-')) throw new Error(`${argument} requires a value`);
    index += 1;
  }
}

const taskPath = valueAfter(args, '--task');
const text = valueAfter(args, '--text') ?? positionalArgs(args).join(' ');
const task = taskPath ? JSON.parse(readFileSync(taskPath, 'utf8')) : { request: text };
const intent = valueAfter(args, '--intent');
if (intent) task.intent = intent;
const operationValues = valuesAfter(args, '--operations');
if (operationValues.length > 0) {
  task.operations = operationValues
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean);
}
const paths = valueAfter(args, '--paths');
if (paths) task.paths = paths.split(',').map((path) => path.trim()).filter(Boolean);
const capabilities = valueAfter(args, '--capabilities');
if (capabilities) task.requestedCapabilities = capabilities.split(',').map((value) => value.trim()).filter(Boolean);
const authorized = valueAfter(args, '--authorized');
if (authorized) task.authorizedCapabilities = authorized.split(',').map((value) => value.trim()).filter(Boolean);
const lane = valueAfter(args, '--lane');
if (lane) task.lane = lane;
const activeValues = {
  owner: valueAfter(args, '--active-owner'),
  worktree: valueAfter(args, '--active-worktree'),
  lane: valueAfter(args, '--active-lane'),
};
if (Object.values(activeValues).some((value) => value !== undefined)) {
  task.activeChanges = Object.fromEntries(
    Object.entries(activeValues).map(([key, value]) => [key, value === undefined ? null : Number(value)]),
  );
}
const { profile, source } = loadProfile({ explicitPath: valueAfter(args, '--profile') });
const route = routeTask(task, profile);
console.log(JSON.stringify({ profileSource: source, route }, null, 2));
process.exitCode = exitCodeFor(route.advisoryState);
