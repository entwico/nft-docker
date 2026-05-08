import { type APIRoute } from 'astro';
import { Subject } from 'rxjs';

export const GET: APIRoute = async ({ locals }) => {
  // the Subject came from middleware (different module). if rxjs is
  // dual-loaded across chunks, the imported Subject here is a
  // different class than the one used in middleware → instanceof fails.
  const ok = locals.stream instanceof Subject;

  return new Response(JSON.stringify({ singletonPreserved: ok }), {
    status: ok ? 200 : 500,
    headers: { 'content-type': 'application/json' },
  });
};
