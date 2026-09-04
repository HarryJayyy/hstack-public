export const EXIT_STATES = Object.freeze({
  PASS: 'PASS',
  VIOLATION: 'VIOLATION',
  INCOMPLETE: 'INCOMPLETE',
  STALE: 'STALE',
  UNKNOWN: 'UNKNOWN',
});

export const EXIT_CODES = Object.freeze({
  PASS: 0,
  VIOLATION: 2,
  INCOMPLETE: 3,
  STALE: 4,
  UNKNOWN: 5,
});

const PRIORITY = [
  EXIT_STATES.VIOLATION,
  EXIT_STATES.INCOMPLETE,
  EXIT_STATES.UNKNOWN,
  EXIT_STATES.STALE,
  EXIT_STATES.PASS,
];

export function isExitState(value) {
  return Object.values(EXIT_STATES).includes(value);
}

export function aggregateExitState(states) {
  const normalized = states.filter(Boolean);
  if (!normalized.length) return EXIT_STATES.UNKNOWN;
  for (const state of normalized) {
    if (!isExitState(state)) throw new Error(`Unknown HStack exit state: ${state}`);
  }
  return PRIORITY.find((candidate) => normalized.includes(candidate)) ?? EXIT_STATES.UNKNOWN;
}

export function exitCodeFor(state) {
  if (!isExitState(state)) throw new Error(`Unknown HStack exit state: ${state}`);
  return EXIT_CODES[state];
}
