import { execSync } from 'child_process';
import { type PmName, detectPm } from '../utils/detect-pm.mjs';
import { preinstall } from './preinstall.mjs';
import { prune, type PruneOptions } from './prune.mjs';

const installCommands: Record<PmName, string> = {
  pnpm: 'pnpm install --frozen-lockfile',
  npm: 'npm ci',
  yarn: 'yarn install --frozen-lockfile',
};

export async function install(entrypoints: string[], opts: PruneOptions = {}) {
  if (entrypoints.length === 0) {
    throw new Error('usage: nft-docker install --entrypoint <path>');
  }

  await preinstall();

  const pm = detectPm();
  const cmd = installCommands[pm.name];

  console.log(`running: ${cmd}`);

  execSync(cmd, { stdio: 'inherit' });

  await prune(entrypoints, opts);
}
