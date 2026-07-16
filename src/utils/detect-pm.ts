import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export type PmName = 'pnpm' | 'npm' | 'yarn';

export interface PmInfo {
  name: PmName;
}

const KNOWN_PMS: Set<PmName> = new Set(['pnpm', 'npm', 'yarn']);

export function detectPm(cwd = process.cwd()): PmInfo {
  const pkgPath = join(cwd, 'package.json');

  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

    if (pkg.packageManager) {
      const name = pkg.packageManager.split('@', 1)[0] as PmName;

      if (KNOWN_PMS.has(name)) {
        return { name };
      }
    }
  }

  if (existsSync(join(cwd, 'pnpm-lock.yaml'))) return { name: 'pnpm' };
  if (existsSync(join(cwd, 'package-lock.json'))) return { name: 'npm' };
  if (existsSync(join(cwd, 'yarn.lock'))) return { name: 'yarn' };

  return { name: 'npm' };
}
