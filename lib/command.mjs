import { spawnSync } from 'node:child_process';

export function run(program, args, options = {}) {
  const result = spawnSync(program, args, {
    cwd: options.cwd,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    windowsHide: true,
    env: options.env ?? process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = result.stderr.trim() || result.stdout.trim() || 'no output';
    throw new Error(`${program} ${args.join(' ')} failed (${result.status}): ${detail}`);
  }
  return result.stdout;
}

export function tryRun(program, args, options = {}) {
  try {
    return { ok: true, output: run(program, args, options) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
