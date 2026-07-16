import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { bootAndProbe, installBuildPrune, prepareSample, type Pm, type ProbeResult } from './harness.js';
import { discoverRuntimes } from './runtimes.js';

const SETUP_TIMEOUT = 600_000;

// /api/compute (worker via new URL) and /api/log (pino-pretty worker transport) are not probed
// — both are known-hard cases orthogonal to pruning. loader-patchers are still covered: the
// server can't boot at all unless instrument.mjs's iitm/ritm/sdk-node survived the prune.
const FLOWS = [
  {
    name: 'rewrite',
    rewrite: true,
    // -r rebundles rxjs, so the middleware/route singleton check is out of scope here.
    routes: ['/api/trace', '/api/resize'],
  },
  {
    name: 'prune',
    rewrite: false,
    routes: ['/api/trace', '/api/resize', '/api/stream'],
  },
] as const;

const PMS: Pm[] = ['pnpm', 'npm'];
const runtimes = discoverRuntimes();

for (const runtime of runtimes) {
  for (const pm of PMS) {
    for (const flow of FLOWS) {
      describe.skipIf(!runtime.available)(`e2e astro-app · ${runtime.name} · ${pm} · ${flow.name}`, () => {
        let sample: ReturnType<typeof prepareSample>;
        let probes: ProbeResult[];
        let serverLog = '';

        beforeAll(async () => {
          sample = prepareSample('astro-app', pm, runtime);
          installBuildPrune(sample.dir, pm, flow);

          const out = await bootAndProbe(sample.dir, flow, [...flow.routes]);

          probes = out.results;
          serverLog = out.log;
        }, SETUP_TIMEOUT);

        afterAll(() => sample?.cleanup());

        for (const route of flow.routes) {
          it(`serves ${route} from the pruned tree`, () => {
            const probe = probes.find((p) => p.route === route)!;

            expect(probe.status, `${route} → ${probe.status}\n${probe.body}\n---server---\n${serverLog}`).toBe(200);
          });
        }

        it('loads the OTLP proto exporter reached via __require', () => {
          const trace = probes.find((p) => p.route === '/api/trace')!;

          expect(trace.body).toContain('OTLPTraceExporter');
        });
      });
    }
  }
}
