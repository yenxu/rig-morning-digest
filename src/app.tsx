import { Hono } from 'hono';
import { loadConfig, type RigConfig } from './config.js';
import { readNight } from './digest/read.js';
import type { Night } from './digest/types.js';
import { lane } from './lane.js';
import { readStatus } from './status.js';
import { DigestPage } from './views/digest.js';
import { Layout } from './views/layout.js';
import { StatusBoard } from './views/status.js';

// Strict shape check keeps `:night` from ever reaching the filesystem as a path.
const NIGHT = /^\d{4}-\d{2}-\d{2}$/;

export function createApp(config: RigConfig = loadConfig()) {
  const app = new Hono();

  // Page and JSON both go through here, so they read the same Night and cannot disagree (ADR 0001).
  const nightFor = (night: string): Night | null =>
    NIGHT.test(night) ? readNight(config.runsDir, night) : null;

  app.get('/health', (c) => c.json({ ok: true, lane: lane().id }));

  app.get('/', (c) =>
    c.html(
      <Layout title="status" lane={lane()}>
        <StatusBoard status={readStatus(config)} />
      </Layout>,
    ),
  );

  app.get('/digest/:night', (c) => {
    const night = c.req.param('night');
    const data = nightFor(night);
    if (!data) return c.notFound();
    return c.html(
      <Layout title={`digest · ${night}`} lane={lane()}>
        <DigestPage night={data} />
      </Layout>,
    );
  });

  // Agents read this route.
  app.get('/api/digest/:night', (c) => {
    const data = nightFor(c.req.param('night'));
    if (!data) return c.json({ error: 'no such night' }, 404);
    return c.json(data);
  });

  return app;
}
