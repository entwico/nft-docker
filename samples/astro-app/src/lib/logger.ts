import pino from 'pino';

// pino spawns a worker thread and resolves the `target` string at
// runtime via require.resolve from the worker. static analysis cannot
// see this edge — pino-pretty must be force-external and on disk
// alongside pino.
export const log = pino({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true, singleLine: true },
  },
});
