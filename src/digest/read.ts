import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestRow, ReadNight, RunStatus } from './types.js';

type Line = { at: string; job: string; status: RunStatus; owner: string | null; error?: string };

const STATUSES: readonly string[] = ['ok', 'retry', 'fail'];

// The log is written by many jobs and can be cut mid-line; validate here so nothing downstream re-checks.
function parseLine(text: string): Line | null {
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
  const line: Line = { at: o.at, job: o.job, status: o.status as RunStatus, owner: o.owner };
  if (o.error !== undefined) line.error = o.error;
  return line;
}

export const readNight: ReadNight = (runsDir, night) => {
  const file = join(runsDir, `${night}.jsonl`);
  if (!existsSync(file)) return null;

  const byJob = new Map<string, DigestRow>();
  let badLines = 0;

  for (const raw of readFileSync(file, 'utf8').split('\n')) {
    if (raw.trim() === '') continue;
    const line = parseLine(raw);
    if (!line) {
      badLines++;
      continue;
    }
    const prev = byJob.get(line.job);
    // File order is the truth for "last": `at` strings carry offsets and are not compared.
    byJob.set(line.job, {
      job: line.job,
      owner: line.owner,
      runs: (prev?.runs ?? 0) + 1,
      retries: (prev?.retries ?? 0) + (line.status === 'retry' ? 1 : 0),
      lastStatus: line.status,
      lastError: line.error ?? null,
      first: prev?.first ?? line.at,
      last: line.at,
    });
  }

  const rows = [...byJob.values()].sort((a, b) => (a.job < b.job ? -1 : a.job > b.job ? 1 : 0));
  return { night, rows, badLines };
};
