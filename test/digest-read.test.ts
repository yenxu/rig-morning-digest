import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/read.js';

const tempRuns = () => mkdtempSync(join(tmpdir(), 'rig-runs-'));

describe('readNight', () => {
  const night = readNight('runs', '2026-10-28');
  const row = (job: string) => night?.rows.find((r) => r.job === job);

  it('folds 2026-10-28 into 5 jobs, sorted, and counts the truncated line', () => {
    expect(night).not.toBeNull();
    expect(night?.night).toBe('2026-10-28');
    expect(night?.badLines).toBe(1);
    const jobs = night?.rows.map((r) => r.job) ?? [];
    expect(jobs).toHaveLength(5);
    expect(jobs).toEqual([...jobs].sort());
  });

  it('counts runs and retries per job and takes the last status', () => {
    expect(row('fixtures/refresh')).toMatchObject({
      runs: 4,
      retries: 3,
      lastStatus: 'ok',
      lastError: null,
      first: '2026-10-29T01:30:00+01:00',
      last: '2026-10-29T01:37:00+01:00',
    });
  });

  it('keeps the last error of a failed job', () => {
    expect(row('notes/backup')).toMatchObject({ lastStatus: 'fail', lastError: 'quota exceeded', owner: 'lane-07' });
  });

  it('keeps a job whose owner is null', () => {
    expect(row('digest/render')).toMatchObject({ owner: null, runs: 1, lastStatus: 'ok' });
  });

  it('returns null when the night has no file', () => {
    expect(readNight(tempRuns(), '2026-01-01')).toBeNull();
  });

  it('reads an empty file as no rows and no bad lines', () => {
    const dir = tempRuns();
    writeFileSync(join(dir, '2026-01-02.jsonl'), '');
    expect(readNight(dir, '2026-01-02')).toEqual({ night: '2026-01-02', rows: [], badLines: 0 });
  });

  it('counts lines with the wrong shape as bad, never throws', () => {
    const dir = tempRuns();
    const lines = [
      '[]',
      'null',
      '{"at":"t","job":"a","status":"weird","owner":null}',
      '{"at":"t","job":"a","status":"ok"}',
      '{"at":"t","job":"a","status":"ok","owner":null,"error":5}',
      '{"at":"t","job":"a","status":"ok","owner":null}',
    ];
    writeFileSync(join(dir, '2026-01-03.jsonl'), lines.join('\n') + '\n\n');
    const n = readNight(dir, '2026-01-03');
    expect(n?.badLines).toBe(5);
    expect(n?.rows).toHaveLength(1);
  });
});
