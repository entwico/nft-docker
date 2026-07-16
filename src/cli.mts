#!/usr/bin/env node

import { parseArgs } from 'util';
import { install } from './commands/install.mjs';
import { prune } from './commands/prune.mjs';

const [command, ...rest] = process.argv.slice(2);

interface CommandOptions {
  rewrite: boolean;
  preserve: string[];
  minify: boolean;
  sourcemap: boolean;
  verbose: boolean;
}

const commands: Record<string, (entrypoints: string[], opts: CommandOptions) => Promise<void>> = {
  install,
  prune,
};

if (!command || !commands[command]) {
  console.error(
    'usage: bonsai <install|prune> <entrypoint>... ' +
      '[-p|--preserve <glob>]... ' +
      '[--no-rewrite] [--no-minify] [--no-sourcemap] [-v|--verbose]',
  );
  process.exit(1);
}

try {
  const { values, positionals } = parseArgs({
    args: rest,
    allowPositionals: true,
    options: {
      preserve: { type: 'string', short: 'p', multiple: true },
      'no-rewrite': { type: 'boolean', default: false },
      'no-minify': { type: 'boolean', default: false },
      'no-sourcemap': { type: 'boolean', default: false },
      verbose: { type: 'boolean', short: 'v', default: false },
    },
    strict: true,
  });

  await commands[command](positionals, {
    rewrite: !(values['no-rewrite'] ?? false),
    preserve: values.preserve ?? [],
    minify: !(values['no-minify'] ?? false),
    sourcemap: !(values['no-sourcemap'] ?? false),
    verbose: values.verbose ?? false,
  });
} catch (err) {
  console.error((err as Error).message);
  process.exit(1);
}
