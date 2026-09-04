import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateCapabilities } from './capabilities.mjs';
import { supportedCIProviders, supportedRepositoryProviders } from './adapters.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const AUTHORITY_MODES = new Set(['canonical', 'overlay', 'advisory']);

function assertStringArray(value, field) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`${field} must be an array of strings`);
  }
}

export function validateProfile(profile, source = '<profile>') {
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
    throw new Error(`${source} must contain a JSON object`);
  }
  if (profile.schemaVersion !== 1) throw new Error(`${source}: schemaVersion must be 1`);
  if (!profile.name || typeof profile.name !== 'string') {
    throw new Error(`${source}: name must be a non-empty string`);
  }
  if (!AUTHORITY_MODES.has(profile.authorityMode)) {
    throw new Error(`${source}: authorityMode must be canonical, overlay, or advisory`);
  }
  if (!profile.primaryRemote || typeof profile.primaryRemote !== 'string') {
    throw new Error(`${source}: primaryRemote must be a non-empty string`);
  }
  assertStringArray(profile.baseBranches, `${source}: baseBranches`);
  assertStringArray(profile.protectedBranches, `${source}: protectedBranches`);
  assertStringArray(profile.frameworkProfiles, `${source}: frameworkProfiles`);
  if (!supportedRepositoryProviders.includes(profile.provider)) {
    throw new Error(`${source}: provider must be github or gitlab`);
  }
  if (typeof profile.publicHandoffs !== 'boolean') {
    throw new Error(`${source}: publicHandoffs must be boolean`);
  }
  if (!Array.isArray(profile.riskRules)) throw new Error(`${source}: riskRules must be an array`);
  for (const [index, rule] of profile.riskRules.entries()) {
    if (!rule?.name || typeof rule.name !== 'string') {
      throw new Error(`${source}: riskRules[${index}].name must be a string`);
    }
    assertStringArray(rule.pathPrefixes ?? [], `${source}: riskRules[${index}].pathPrefixes`);
    assertStringArray(rule.overlays ?? [], `${source}: riskRules[${index}].overlays`);
  }
  if (!profile.verification || typeof profile.verification !== 'object') {
    throw new Error(`${source}: verification must be an object`);
  }
  for (const lane of ['typeCheck', 'unit', 'integration', 'build', 'live']) {
    assertStringArray(profile.verification[lane] ?? [], `${source}: verification.${lane}`);
  }
  validateCapabilities(profile.capabilities, `${source}: capabilities`);
  if (!profile.concurrency || typeof profile.concurrency !== 'object') {
    throw new Error(`${source}: concurrency must be an object`);
  }
  for (const field of ['perOwner', 'perWorktree']) {
    if (!Number.isInteger(profile.concurrency[field]) || profile.concurrency[field] < 1) {
      throw new Error(`${source}: concurrency.${field} must be a positive integer`);
    }
  }
  if (!profile.concurrency.lanes || typeof profile.concurrency.lanes !== 'object') {
    throw new Error(`${source}: concurrency.lanes must be an object`);
  }
  if (!Number.isInteger(profile.concurrency.lanes.default) || profile.concurrency.lanes.default < 1) {
    throw new Error(`${source}: concurrency.lanes.default must be a positive integer`);
  }
  for (const [lane, limit] of Object.entries(profile.concurrency.lanes)) {
    if (!lane || !Number.isInteger(limit) || limit < 1) {
      throw new Error(`${source}: concurrency lane limits must be positive integers`);
    }
  }
  if (!profile.evidence || !Number.isInteger(profile.evidence.ttlSeconds) || profile.evidence.ttlSeconds < 1) {
    throw new Error(`${source}: evidence.ttlSeconds must be a positive integer`);
  }
  assertStringArray(profile.evidence.invalidationTriggers, `${source}: evidence.invalidationTriggers`);
  if (!profile.adapters || typeof profile.adapters !== 'object') {
    throw new Error(`${source}: adapters must be an object`);
  }
  if (profile.adapters.repository !== profile.provider) {
    throw new Error(`${source}: adapters.repository must match provider`);
  }
  if (!supportedCIProviders.includes(profile.adapters.ci)) {
    throw new Error(`${source}: adapters.ci is unsupported`);
  }
  assertStringArray(profile.adapters.frameworks, `${source}: adapters.frameworks`);
  if (!Array.isArray(profile.adapters.deployments)) {
    throw new Error(`${source}: adapters.deployments must be an array`);
  }
  for (const [index, deployment] of profile.adapters.deployments.entries()) {
    if (!deployment?.provider || !deployment?.identitySource) {
      throw new Error(`${source}: adapters.deployments[${index}] requires provider and identitySource`);
    }
  }
  return profile;
}

export function readProfile(path) {
  const absolute = resolve(path);
  const parsed = JSON.parse(readFileSync(absolute, 'utf8'));
  return validateProfile(parsed, absolute);
}

export function loadProfile({ cwd = process.cwd(), explicitPath, name } = {}) {
  if (explicitPath) return { profile: readProfile(explicitPath), source: resolve(explicitPath) };
  const local = resolve(cwd, '.hstack.json');
  if (existsSync(local)) return { profile: readProfile(local), source: local };
  const bundled = resolve(ROOT, 'profiles', `${name ?? 'generic'}.json`);
  return { profile: readProfile(bundled), source: bundled };
}

export const authorityModes = [...AUTHORITY_MODES];
