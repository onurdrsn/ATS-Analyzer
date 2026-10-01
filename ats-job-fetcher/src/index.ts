import './tracing.js'; // OTel SDK — must be first import
import { serve } from '@hono/node-server';
import { app } from './app.js';

export { app } from './app.js';
export * from './validator.js';

const port = Number(process.env.PORT) || 3001;
console.log(`ats-job-fetcher running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});
