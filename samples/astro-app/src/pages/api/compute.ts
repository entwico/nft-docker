import { Worker } from 'node:worker_threads';
import { type APIRoute } from 'astro';

export const GET: APIRoute = async ({ url }) => {
  const n = Number(url.searchParams.get('n') ?? 10);

  // the worker file is resolved relative to import.meta.url at runtime.
  // bundling the worker source inline into entry.mjs would break the
  // URL resolution and the worker entry must remain a separate file
  // on disk. AST scan flags `new Worker(new URL(..., import.meta.url))`.
  const result = await new Promise<number>((resolve, reject) => {
    const worker = new Worker(new URL('../../workers/compute.worker.mjs', import.meta.url), { workerData: { n } });

    worker.once('message', resolve);
    worker.once('error', reject);
    worker.once('exit', (code) => {
      if (code !== 0) reject(new Error(`worker exited ${code}`));
    });
  });

  return new Response(JSON.stringify({ n, fib: result }), {
    headers: { 'content-type': 'application/json' },
  });
};
