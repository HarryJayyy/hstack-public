const STEP_GROUPS = ['doctor', 'launch', 'cleanup'];
const FEATURE_GROUPS = ['drive', 'observe', 'negativeControl'];

function object(value, label, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object`);
  const unknown = Object.keys(value).filter((key) => !keys.includes(key));
  if (unknown.length) throw new Error(`${label}: unsupported fields: ${unknown.join(', ')}`);
}

function text(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be non-empty text`);
}

function steps(value, label) {
  if (!Array.isArray(value) || !value.length) throw new Error(`${label} requires at least one step`);
  value.forEach((step, index) => {
    const prefix = `${label}[${index}]`;
    object(step, prefix, ['procedure', 'expected', 'failureMeaning']);
    for (const key of ['procedure', 'expected', 'failureMeaning']) text(step[key], `${prefix}.${key}`);
  });
}

function strings(value, label) {
  if (!Array.isArray(value) || !value.length) throw new Error(`${label} requires at least one item`);
  value.forEach((item, index) => text(item, `${label}[${index}]`));
}

export function validateVerificationGuide(input) {
  object(input, 'guide', [
    'schemaVersion', 'name', 'environment', 'workingDirectory', 'source', 'ownership',
    ...STEP_GROUPS, 'features',
  ]);
  if (input.schemaVersion !== 'hstack-verification-guide/v1') throw new Error('unsupported verification guide schemaVersion');
  for (const key of ['name', 'environment', 'workingDirectory', 'source', 'ownership']) text(input[key], key);
  for (const key of STEP_GROUPS) steps(input[key], key);
  if (!Array.isArray(input.features) || !input.features.length) throw new Error('features requires at least one feature');
  const ids = new Set();
  input.features.forEach((feature, index) => {
    const prefix = `features[${index}]`;
    object(feature, prefix, ['id', 'claim', 'fixture', 'binding', ...FEATURE_GROUPS, 'invalidatesOn', 'limitations']);
    for (const key of ['id', 'claim', 'fixture', 'binding']) text(feature[key], `${prefix}.${key}`);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(feature.id)) throw new Error(`${prefix}.id must be kebab-case`);
    if (ids.has(feature.id)) throw new Error(`duplicate feature id: ${feature.id}`);
    ids.add(feature.id);
    for (const key of FEATURE_GROUPS) steps(feature[key], `${prefix}.${key}`);
    for (const key of ['invalidatesOn', 'limitations']) strings(feature[key], `${prefix}.${key}`);
  });
  return input;
}

function block(value) {
  // Choose a fence longer than caller content so procedures remain literal text.
  const runs = value.match(/`+/g) ?? [];
  const fence = '`'.repeat(Math.max(3, ...runs.map((run) => run.length + 1)));
  return `${fence}text\n${value}\n${fence}`;
}

function renderSteps(title, values) {
  return `### ${title}\n\n${values.map((step, index) => (
    `${index + 1}. Procedure:\n\n${block(step.procedure)}\n\nExpected:\n\n${block(step.expected)}\n\nFailure meaning:\n\n${block(step.failureMeaning)}`
  )).join('\n\n')}\n`;
}

export function createVerificationGuide(input) {
  validateVerificationGuide(input);
  const sections = [
    '# Project Verification Guide',
    'Status: DRAFT — no procedures have been executed by this generator.',
    'Private host material. Review every procedure against current authority and environment before execution.',
    ...['name', 'environment', 'workingDirectory', 'source', 'ownership'].map((key) => `${key}:\n\n${block(input[key])}`),
    renderSteps('Doctor', input.doctor),
    renderSteps('Launch', input.launch),
  ];
  for (const feature of input.features) {
    sections.push(`## Feature: ${feature.id} (DRAFT)`);
    for (const key of ['claim', 'fixture', 'binding']) sections.push(`${key}:\n\n${block(feature[key])}`);
    for (const key of FEATURE_GROUPS) sections.push(renderSteps(key, feature[key]));
    for (const key of ['invalidatesOn', 'limitations']) sections.push(`${key}:\n\n${block(feature[key].join('\n'))}`);
  }
  sections.push(renderSteps('Owned cleanup', input.cleanup));
  sections.push('Record actual commands, exits, timestamps, state bindings, artifacts and cleanup observations in a separate evidence envelope. Only exercised features may receive a bound verification verdict.');
  return {
    schemaVersion: 'hstack-verification-guide-draft/v1',
    status: 'DRAFT',
    executed: false,
    features: input.features.map(({ id }) => ({ id, status: 'DRAFT' })),
    markdown: `${sections.join('\n\n')}\n`,
  };
}
