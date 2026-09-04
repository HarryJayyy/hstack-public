#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { redactPublicHandoff } from '../lib/redaction.mjs';

function valueAfter(args, flag) {
  const index = args.indexOf(flag);
  return index === -1 ? undefined : args[index + 1];
}

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log('Usage: hstack redact [--input path] --sensitive-values path');
  console.log('The sensitive-values file must be a non-empty JSON array of caller-known secret strings.');
  console.log('Output is defense in depth for an approved handoff shape, not public-safety certification.');
  process.exit(0);
}

const sensitivePath = valueAfter(args, '--sensitive-values');
if (!sensitivePath) {
  console.error('INCOMPLETE: general handoff redaction requires --sensitive-values <json-array-path>');
  process.exit(3);
}
const sensitiveValues = JSON.parse(readFileSync(resolve(process.cwd(), sensitivePath), 'utf8'));
if (!Array.isArray(sensitiveValues) ||
    sensitiveValues.length === 0 ||
    !sensitiveValues.every((value) => typeof value === 'string' && value.length > 0)) {
  console.error('INCOMPLETE: --sensitive-values must contain a non-empty JSON array of non-empty strings');
  process.exit(3);
}

const inputIndex = args.indexOf('--input');
const raw = inputIndex === -1 ? readFileSync(0, 'utf8') : readFileSync(args[inputIndex + 1], 'utf8');
let value = raw;
try {
  value = JSON.parse(raw);
} catch {
  // Plain text is a supported input.
}
const result = redactPublicHandoff(value, { sensitiveValues });
console.log(typeof result === 'string' ? result : JSON.stringify(result, null, 2));
