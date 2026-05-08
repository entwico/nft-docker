import { defineMiddleware } from 'astro/middleware';
import { createStream } from './lib/stream';

// the Subject created here is later checked with `instanceof Subject`
// in /api/stream. if rxjs ends up inlined in one chunk and external in
// another, the two `Subject` symbols diverge and instanceof returns
// false. the bundler must keep rxjs as a single instance — fully
// inlined or fully external, never split.
export const onRequest = defineMiddleware(async (ctx, next) => {
  ctx.locals.stream = createStream();
  return next();
});
