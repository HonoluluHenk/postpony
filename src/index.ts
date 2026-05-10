import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { Eta } from 'eta';
import * as path from 'path';

import { serveStatic } from '@hono/node-server/serve-static';

const app = new Hono();
const eta = new Eta({ views: path.join(process.cwd(), 'src/views') });

app.use('/css/*', serveStatic({ root: './src/public' }));
app.use('/js/*', serveStatic({ root: './src/public' }));

app.get('/', (c) => {
  const html = eta.render('index.eta', { title: 'Game Re-scheduler' });
  return c.html(html);
});

app.get('/create', (c) => {
  const html = eta.render('create.eta', { title: 'Create a new ReSchedule' });
  return c.html(html);
});

app.get('/edit', (c) => {
  const html = eta.render('edit.eta', { title: 'Edit an existing ReSchedule' });
  return c.html(html);
});

const port = 3000;
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port
});
