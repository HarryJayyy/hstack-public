#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { assessChangeStatus } from '../lib/change-status.mjs';
import { evaluateEventProofReceipt, validateEventProofReceipt } from '../lib/event-proof.mjs';
import { EXIT_STATES, exitCodeFor } from '../lib/states.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DELEGATED_COMMANDS = new Map([
  ['route', 'route.mjs'],
  ['execute', 'execute.mjs'],
  ['inventory', 'inventory.mjs'],
  ['fingerprint', 'fingerprint.mjs'],
  ['redact', 'redact.mjs'],
]);

function help() {
  console.log(`HStack command line

Usage: hstack <command> [options]

Commands:
  route          Classify a task and select controls
  execute        Evaluate a structured execution contract
  inventory      Produce a read-only open-work inventory
  fingerprint    Fingerprint exact repository and worktree state
  redact         Redact a JSON or text handoff
  status         Evaluate CI and review status from JSON
  verify-event   Validate an hstack-event-proof/v1 receipt
  version        Print the installed HStack version

Run hstack <command> --help for command options.`);
}

function inputFrom(args) {
  const inputIndex = args.indexOf('--input');
  if (inputIndex === -1) return readFileSync(0, 'utf8');
  const path = args[inputIndex + 1];
  if (!path) throw new Error('--input requires a path');
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

function delegate(command, args) {
  const result = spawnSync(process.execPath, [resolve(ROOT, 'scripts', DELEGATED_COMMANDS.get(command)), ...args], {
    cwd: process.cwd(),
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.signal) throw new Error(`${command} terminated by ${result.signal}`);
  return result.status ?? 1;
}

function evaluateStatus(args) {
  const input = JSON.parse(inputFrom(args));
  const result = assessChangeStatus(input);
  console.log(JSON.stringify(result, null, 2));
  return exitCodeFor(result.state);
}

function verifyEvent(args) {
  const receipt = JSON.parse(inputFrom(args));
  const evaluation = evaluateEventProofReceipt(receipt);
  try {
    const result = validateEventProofReceipt(receipt);
    console.log(JSON.stringify({ valid: true, ...result }, null, 2));
    return result.evaluation.exitCode;
  } catch (error) {
    const result = {
      valid: false,
      state: EXIT_STATES.VIOLATION,
      exitCode: exitCodeFor(EXIT_STATES.VIOLATION),
      evaluation,
      declarationError: error instanceof Error ? error.message : String(error),
    };
    console.log(JSON.stringify(result, null, 2));
    return result.exitCode;
  }
}

function version() {
  const packageJson = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'));
  console.log(packageJson.version);
  return 0;
}

const [command, ...args] = process.argv.slice(2);
try {
  if (!command || command === '--help' || command === '-h' || command === 'help') {
    help();
    process.exitCode = 0;
  } else if (command === '--version' || command === '-v' || command === 'version') {
    process.exitCode = version();
  } else if (DELEGATED_COMMANDS.has(command)) {
    process.exitCode = delegate(command, args);
  } else if (command === 'status') {
    process.exitCode = evaluateStatus(args);
  } else if (command === 'verify-event') {
    process.exitCode = verifyEvent(args);
  } else {
    console.error(`Unknown HStack command: ${command}`);
    help();
    process.exitCode = 2;
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 2;
}
