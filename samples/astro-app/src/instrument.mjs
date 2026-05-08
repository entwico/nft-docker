// preloaded with `node --import ./instrument.mjs ./entry.mjs`
//
// the auto-instrumentations patch require/import hooks. they MUST run
// before any other module loads — if the bundler inlines this file
// into entry.mjs, the patches arrive too late and instrumentation is
// silently broken. force these packages external.

import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { NodeSDK } from '@opentelemetry/sdk-node';

const sdk = new NodeSDK({
  serviceName: 'astro-app-sample',
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();

process.on('SIGTERM', () => {
  sdk.shutdown().finally(() => process.exit(0));
});
