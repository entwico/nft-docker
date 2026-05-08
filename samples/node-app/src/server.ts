import { fork } from 'node:child_process';
import { createServer } from 'node:http';

// AST scan: child_process.fork(...) — the worker file must remain a
// separate on-disk entry alongside server.js, even if the bundler
// could otherwise inline its source. NFT runs against both.
const child = fork(new URL('./worker.js', import.meta.url), {
  stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
});

// non-literal dynamic import — analog of require(non_literal). bundlers
// cannot statically analyze the target. AST scanner flags this; the
// surrounding package and any candidate plugin file must remain on disk
// so the runtime resolution actually works.
//
// compare with `await import('./plugins/foo.js')` (literal) — that case
// is handled natively by the bundler: it emits a chunk and rewrites
// the call site, no special seed entry needed.
const pluginPath = process.env.PLUGIN ?? './plugins/foo.js';
const plugin = (await import(pluginPath)) as { name: string; run(): string };

const server = createServer((_req, res) => {
  child.send({ type: 'ping' });

  child.once('message', (msg) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ plugin: plugin.name, line: plugin.run(), worker: msg }));
  });
});

server.listen(3000, () => {
  console.log('listening on :3000 with plugin', plugin.name);
});

process.on('SIGTERM', () => {
  child.kill();
  server.close(() => process.exit(0));
});
