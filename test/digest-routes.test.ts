import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

// Fixture runs live in temp dirs so `runs/` (real nights, read-only) is never touched.
const tempRuns = () => mkdtempSync(join(tmpdir(), 'rig-digest-'));
const configFor = (runsDir: string) => ({
  adapter: 'shim',
  installed: '2026-10-29T14:06:00+01:00',
  beatEverySeconds: 60,
  runsDir,
});

const NIGHT = '2026-10-28';

// File order differs from job order on purpose: the page and JSON must both sort by job.
const GOOD_LINES = [
  '{"at":"2026-10-28T23:00:02+01:00","job":"rig/rotate-logs","status":"ok","owner":"lane-07"}',
  '{"at":"2026-10-28T23:00:06+01:00","job":"lane/sync","status":"retry","owner":"rook","error":"timeout"}',
  '{"at":"2026-10-28T23:00:09+01:00","job":"lane/sync","status":"ok","owner":"rook"}',
  '{"at":"2026-10-28T23:10:00+01:00","job":"digest/render","status":"ok","owner":null}',
  '{"at":"2026-10-28T23:20:00+01:00","job":"notes/backup","status":"fail","owner":"lane-07","error":"quota exceeded"}',
];
const EXPECTED_JOBS = ['digest/render', 'lane/sync', 'notes/backup', 'rig/rotate-logs'];

/** Job names in the order they appear as table rows on the page. */
function pageJobs(html: string): string[] {
  return [...html.matchAll(/<tr[^>]*>\s*<td>([^<]*)<\/td>/g)].map((m) => m[1] ?? '');
}

/** The raw HTML of the table row for one job. */
function pageRow(html: string, job: string): string {
  return html.split('<tr').find((chunk) => chunk.includes(`<td>${job}</td>`)) ?? '';
}

describe('GET /digest/:night', () => {
  it('answers 200 with the night heading and one row per job', async () => {
    const dir = tempRuns();
    writeFileSync(join(dir, `${NIGHT}.jsonl`), GOOD_LINES.join('\n') + '\n');
    const res = await createApp(configFor(dir)).request(`/digest/${NIGHT}`);
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain(`<h1>digest · ${NIGHT}</h1>`);
    expect(pageJobs(html)).toEqual(EXPECTED_JOBS);
  });

  it('marks a failed job row as warn and shows a null owner and error as the dash', async () => {
    const dir = tempRuns();
    writeFileSync(join(dir, `${NIGHT}.jsonl`), GOOD_LINES.join('\n') + '\n');
    const html = await (await createApp(configFor(dir)).request(`/digest/${NIGHT}`)).text();
    expect(pageRow(html, 'notes/backup')).toContain('class="warn"');
    expect(pageRow(html, 'lane/sync')).not.toContain('class="warn"');
    expect(pageRow(html, 'digest/render')).toContain('—');
  });

  it('answers 404 for a night with no file', async () => {
    const res = await createApp(configFor(tempRuns())).request(`/digest/${NIGHT}`);
    expect(res.status).toBe(404);
  });

  it('shows "nothing ran" and no table for an empty night', async () => {
    const dir = tempRuns();
    writeFileSync(join(dir, `${NIGHT}.jsonl`), '');
    const res = await createApp(configFor(dir)).request(`/digest/${NIGHT}`);
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('nothing ran');
    expect(html).not.toContain('<table');
  });

  it('stays 200, shows the job rows and reports the bad line', async () => {
    const dir = tempRuns();
    writeFileSync(join(dir, `${NIGHT}.jsonl`), [...GOOD_LINES, '{"at":"2026-10-28T23:3'].join('\n') + '\n');
    const res = await createApp(configFor(dir)).request(`/digest/${NIGHT}`);
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(pageJobs(html)).toEqual(EXPECTED_JOBS);
    expect(html).toContain('1 line(s) did not parse');
  });
});

describe('GET /api/digest/:night', () => {
  it('answers 200 with the Night object', async () => {
    const dir = tempRuns();
    writeFileSync(join(dir, `${NIGHT}.jsonl`), GOOD_LINES.join('\n') + '\n');
    const res = await createApp(configFor(dir)).request(`/api/digest/${NIGHT}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { night: string; rows: { job: string }[]; badLines: number };
    expect(body.night).toBe(NIGHT);
    expect(body.badLines).toBe(0);
    expect(body.rows.map((r) => r.job)).toEqual(EXPECTED_JOBS);
  });

  it('answers 404 with a JSON error for a night with no file', async () => {
    const res = await createApp(configFor(tempRuns())).request(`/api/digest/${NIGHT}`);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'no such night' });
  });

  it('returns no rows and no bad lines for an empty night', async () => {
    const dir = tempRuns();
    writeFileSync(join(dir, `${NIGHT}.jsonl`), '');
    const res = await createApp(configFor(dir)).request(`/api/digest/${NIGHT}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ night: NIGHT, rows: [], badLines: 0 });
  });

  it('counts the bad line and keeps the rows for a night with a bad line', async () => {
    const dir = tempRuns();
    writeFileSync(join(dir, `${NIGHT}.jsonl`), [...GOOD_LINES, '{"at":"2026-10-28T23:3'].join('\n') + '\n');
    const res = await createApp(configFor(dir)).request(`/api/digest/${NIGHT}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { rows: { job: string }[]; badLines: number };
    expect(body.badLines).toBe(1);
    expect(body.rows.map((r) => r.job)).toEqual(EXPECTED_JOBS);
  });
});

describe('page and JSON agree', () => {
  it('list the same jobs in the same order', async () => {
    const dir = tempRuns();
    writeFileSync(join(dir, `${NIGHT}.jsonl`), GOOD_LINES.join('\n') + '\n');
    const app = createApp(configFor(dir));
    const html = await (await app.request(`/digest/${NIGHT}`)).text();
    const body = (await (await app.request(`/api/digest/${NIGHT}`)).json()) as { rows: { job: string }[] };
    expect(pageJobs(html)).toEqual(body.rows.map((r) => r.job));
  });
});
