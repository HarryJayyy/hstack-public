#!/usr/bin/env node
import { readFileSync, realpathSync, mkdtempSync, mkdirSync, writeFileSync, cpSync } from 'node:fs';
import { dirname, resolve, relative, isAbsolute } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { scoreSkillEvaluation } from './skill-evaluation.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const suite = JSON.parse(readFileSync(resolve(root, 'evaluations/cases.json'), 'utf8'));
const args = process.argv.slice(2);
try {
  if (args.length === 0 || args[0] === '--help') {
    console.log('Usage: npm run eval:skills -- --prepare <case-id>\n       npm run eval:skills -- --input <observations.json> --artifact-root <directory>\nNo agent runs are launched automatically. No observations means NOT_RUN.');
    if (!args.length) {
      console.log(JSON.stringify({ assessment: 'NOT_RUN', cases: suite.cases.map(({ id }) => id) }, null, 2));
      process.exitCode = 3;
    }
  } else if (args.length === 2 && args[0] === '--prepare') {
    const entry = suite.cases.find(({ id }) => id === args[1]);
    if (!entry) throw new Error('unknown case ID');
    const workspace = mkdtempSync(resolve(tmpdir(), 'service-work-'));
    for (const [path, content] of Object.entries(entry.files)) {
      const destination = resolve(workspace, path);
      const rel = relative(workspace, destination);
      if (!rel || rel.startsWith('..') || isAbsolute(rel)) throw new Error('fixture path escapes workspace');
      mkdirSync(dirname(destination), { recursive: true });
      writeFileSync(destination, content);
    }
    // Candidate receives instructions and organic task, never the suite's scoring rubric.
    cpSync(resolve(root, 'skills'), resolve(workspace, '.instructions/skills'), { recursive: true });
    writeFileSync(resolve(workspace, 'TASK.md'), `${entry.prompt}\n\nAvailable instructions: .instructions/skills/\n`);
    console.log(JSON.stringify({ workspace, task: 'TASK.md', assessment: 'NOT_RUN', cleanup: 'owned temporary workspace only; retain observations separately' }, null, 2));
  } else {
    if (args.length !== 4 || args[0] !== '--input' || args[2] !== '--artifact-root') throw new Error('expected --input <file> --artifact-root <directory>');
    const artifactRoot = realpathSync(resolve(args[3]));
    const readArtifact = (path) => {
      if (isAbsolute(path)) throw new Error('artifact paths must be relative to artifact root');
      const resolved = realpathSync(resolve(artifactRoot, path));
      const rel = relative(artifactRoot, resolved);
      if (!rel || rel.startsWith('..') || isAbsolute(rel)) throw new Error('artifact escapes declared root');
      return readFileSync(resolved);
    };
    const result = scoreSkillEvaluation(suite, JSON.parse(readFileSync(resolve(args[1]), 'utf8')), readArtifact);
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.runs.some(({ result: state }) => state === 'FAILED') ? 2 : result.assessment !== 'SCORED' ? 3 : 0;
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 2;
}
