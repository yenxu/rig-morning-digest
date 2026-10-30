import { readdirSync } from 'node:fs';
import type { RigConfig } from './config.js';
import { countNight, type StatusCounts } from './digest/counts.js';
import { lastBeat, type Beat } from './heartbeat.js';

export type Status = {
  adapter: string;
  installed: string;
  lastBeat: Beat | null;
  nights: string[];
  /** Per-night log line counts, keyed by night. */
  counts: Record<string, StatusCounts>;
};

// Nights on disk = runs/<YYYY-MM-DD>.jsonl, newest first.
export function nightsOnDisk(runsDir: string): string[] {
  try {
    return readdirSync(runsDir)
      .filter((f) => /^\d{4}-\d{2}-\d{2}\.jsonl$/.test(f))
      .map((f) => f.slice(0, 10))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

export function readStatus(config: RigConfig): Status {
  const nights = nightsOnDisk(config.runsDir);
  const counts: Record<string, StatusCounts> = {};
  for (const n of nights) {
    const c = countNight(config.runsDir, n);
    if (c) counts[n] = c;
  }
  return {
    adapter: config.adapter,
    installed: config.installed,
    lastBeat: lastBeat(),
    nights,
    counts,
  };
}
