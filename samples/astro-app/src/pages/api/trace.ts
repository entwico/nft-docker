import { type APIRoute } from 'astro';
import { createTraceExporter } from '../../lib/tracing';

export const GET: APIRoute = async () => {
  const exporter = createTraceExporter();

  return new Response(JSON.stringify({ ok: true, exporter: (exporter as object).constructor.name }), {
    headers: { 'content-type': 'application/json' },
  });
};
