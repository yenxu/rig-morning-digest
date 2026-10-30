import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { RunStatus } from './types.js';

export type StatusCounts = Record<RunStatus, number>;

const STATUSES: readonly string[] = ['ok', 'retry', 'fail'];

// readNight folds lines into per-job rows, which loses per-status line counts, and it does not
// export its line validator. This repeats its rules (object with string at/job, known status,
// string|null owner, string error if present) so a line counts here only if the digest counts it too.
function statusOf(text: string): RunStatus | null {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const o = value as Record<string, unknown>;
  if (typeof o.at !== 'string' || typeof o.job !== 'string') return null;
  if (typeof o.status !== 'string' || !STATUSES.includes(o.status)) return null;
  if (o.owner !== null && typeof o.owner !== 'string') return null;
  if (o.error !== undefined && typeof o.error !== 'string') return null;
  return o.status as RunStatus;
}

/** Log lines per status for one night; bad lines are excluded. Null when the file does not exist. */
export function countNight(runsDir: string, night: string): StatusCounts | null {
  const file = join(runsDir, `${night}.jsonl`);
  if (!existsSync(file)) return null;
  const counts: StatusCounts = { ok: 0, retry: 0, fail: 0 };
  for (const raw of readFileSync(file, 'utf8').split('\n')) {
    if (raw.trim() === '') continue;
    const s = statusOf(raw);
    if (s) counts[s]++;
  }
  return counts;
}
