import { execSync } from 'node:child_process';
import { type PmName, detectPm } from '../utils/detect-pm';
import { type PruneOptions, prune } from './prune';

const installCommands: Record<PmName, string> = {
  pnpm: 'pnpm install --frozen-lockfile --node-linker=hoisted',
  npm: 'npm ci',
  yarn: 'yarn install --frozen-lockfile',
};

export async function install(entrypoints: string[], opts: PruneOptions = {}) {
  if (entrypoints.length === 0) {
    throw new Error('usage: bonsai install <entrypoint>...');
  }

  const pm = detectPm();
  const cmd = installCommands[pm.name];

  console.log(`running: ${cmd}`);

  execSync(cmd, { stdio: 'inherit' });

  await prune(entrypoints, opts);
}
