import { execSync } from 'child_process';
import { preinstall } from './preinstall.mjs';
import { prune } from './prune.mjs';
import { detectPm } from '../utils/detect-pm.mjs';
import type { PmName } from '../utils/detect-pm.mjs';

const installCommands: Record<PmName, string> = {
  pnpm: 'pnpm install --frozen-lockfile',
  npm: 'npm ci',
  yarn: 'yarn install --frozen-lockfile',
};

export async function install(entrypoints: string[]) {
  if (entrypoints.length === 0) {
    throw new Error('usage: nft-docker install --entrypoint <path>');
  }

  await preinstall();

  const pm = detectPm();
  const cmd = installCommands[pm.name];

  console.log(`running: ${cmd}`);

  execSync(cmd, { stdio: 'inherit' });

  await prune(entrypoints);
}
