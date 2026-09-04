export function parseWorktrees(raw) {
  const worktrees = [];
  let current = null;
  for (const line of `${raw}\n`.split(/\r?\n/)) {
    if (!line) {
      if (current) worktrees.push(current);
      current = null;
      continue;
    }
    const separator = line.indexOf(' ');
    const key = separator === -1 ? line : line.slice(0, separator);
    const value = separator === -1 ? true : line.slice(separator + 1);
    if (key === 'worktree') current = { path: value };
    else if (current && key === 'branch') current.branch = value.replace('refs/heads/', '');
    else if (current && key === 'HEAD') current.head = value;
    else if (current && key === 'detached') current.detached = true;
    else if (current && key === 'locked') current.locked = value === true ? 'yes' : value;
    else if (current && key === 'prunable') current.prunable = value === true ? 'yes' : value;
  }
  return worktrees;
}

export function parseRefs(raw) {
  return raw
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const [name, head, upstream, updated] = line.split('\t');
      return { name, head, upstream, updated };
    });
}

export function classifyBranch({
  name,
  head,
  baseBranches,
  protectedBranches = [],
  attached,
  dirty,
  worktreeUnknown,
  mergedBases = [],
  pullRequest = null,
}) {
  if (baseBranches.includes(name)) return 'BASE BRANCH — PRESERVE';
  if (protectedBranches.includes(name)) return 'PROTECTED BRANCH — PRESERVE';
  if (pullRequest) {
    if (pullRequest.headSha !== head) return `OPEN PR #${pullRequest.number} SHA MISMATCH — PRESERVE`;
    return `OPEN PR #${pullRequest.number}`;
  }
  if (attached && worktreeUnknown) return 'ATTACHED, STATE UNKNOWN — PRESERVE';
  if (attached && dirty > 0) return 'ATTACHED, DIRTY — PRESERVE';
  if (attached && mergedBases.length) return 'ATTACHED + MERGED — REVIEW BEFORE CLEANUP';
  if (attached) return 'ATTACHED, UNMERGED, NO OPEN PR — PRESERVE';
  if (mergedBases.length) return `MERGED CLEANUP CANDIDATE (${mergedBases.join(', ')}) — VERIFY`;
  return 'UNMERGED, NO OPEN PR — PRESERVE';
}

export function flattenPaginated(value) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((page) => (Array.isArray(page) ? page : [page]));
}

export function summarizeInventory(worktrees, branches) {
  return {
    dirtyWorktrees: worktrees.filter((worktree) => (worktree.dirty ?? 0) > 0).length,
    confirmedCleanWorktrees: worktrees.filter((worktree) => worktree.dirty === 0).length,
    unknownWorktrees: worktrees.filter((worktree) => worktree.dirty === null).length,
    baseBranches: branches.filter((branch) => branch.classification.startsWith('BASE BRANCH')).length,
    preserveOrReviewBranches: branches.filter((branch) =>
      /PRESERVE|REVIEW|MISMATCH/.test(branch.classification),
    ).length,
    branchesRequiringReview: branches.filter(
      (branch) =>
        !branch.classification.startsWith('BASE BRANCH') &&
        /PRESERVE|REVIEW|MISMATCH/.test(branch.classification),
    ).length,
    cleanupCandidates: branches.filter((branch) =>
      branch.classification.includes('CLEANUP CANDIDATE'),
    ).length,
  };
}
