import { type APIRoute } from 'astro';
import { log } from '../../lib/logger';

export const GET: APIRoute = async () => {
  log.info({ at: new Date().toISOString() }, 'hello from pino');

  return new Response(JSON.stringify({ ok: true, transport: 'pino-pretty' }), {
    headers: { 'content-type': 'application/json' },
  });
};
