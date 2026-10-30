// Plan morning-digest § 1. The contract section 2 builds against: page, JSON, board link and
// route tests all import from here, so they can start before the reader exists.

export type RunStatus = 'ok' | 'retry' | 'fail';

/** One job's night, folded from its log lines. Times keep the log's offset (styleguide). */
export type DigestRow = {
  job: string;
  /** null when the log says null; views show it as `—`. */
  owner: string | null;
  runs: number;
  retries: number;
  lastStatus: RunStatus;
  lastError: string | null;
  first: string;
  last: string;
};

export type Night = {
  night: string;
  /** Sorted by job, so the page and the JSON share one order. */
  rows: DigestRow[];
  /** Lines that did not parse: counted, never thrown. */
  badLines: number;
};

/** Returns null when `runs/<night>.jsonl` does not exist (the routes turn that into 404). */
export type ReadNight = (runsDir: string, night: string) => Night | null;
