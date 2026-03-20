#!/usr/bin/env node

import { parseArgs } from 'util';
import { install } from './commands/install.mjs';
import { preinstall } from './commands/preinstall.mjs';
import { prune } from './commands/prune.mjs';

const [command, ...rest] = process.argv.slice(2);

const commands: Record<string, (entrypoints: string[]) => Promise<void>> = {
  preinstall: () => preinstall(),
  install,
  prune,
};

if (!command || !commands[command]) {
  console.error('usage: nft-docker <preinstall|install|prune> [--entrypoint|-e <path>]...');
  process.exit(1);
}

try {
  const { values } = parseArgs({
    args: rest,
    options: {
      entrypoint: { type: 'string', short: 'e', multiple: true },
    },
    strict: true,
  });

  await commands[command](values.entrypoint ?? []);
} catch (err) {
  console.error((err as Error).message);
  process.exit(1);
}
