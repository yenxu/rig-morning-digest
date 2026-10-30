import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseLine } from './read.js';
import type { RunStatus } from './types.js';

export type StatusCounts = Record<RunStatus, number>;

// readNight folds lines into per-job rows, which loses per-status line counts. Reusing its
// parseLine means a line counts here exactly when the digest counts it.
/** Log lines per status for one night; bad lines are excluded. Null when the file does not exist. */
export function countNight(runsDir: string, night: string): StatusCounts | null {
  const file = join(runsDir, `${night}.jsonl`);
  if (!existsSync(file)) return null;
  const counts: StatusCounts = { ok: 0, retry: 0, fail: 0 };
  for (const raw of readFileSync(file, 'utf8').split('\n')) {
    if (raw.trim() === '') continue;
    const line = parseLine(raw);
    if (line) counts[line.status]++;
  }
  return counts;
}
