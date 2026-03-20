import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export type PmName = 'pnpm' | 'npm' | 'yarn';

export interface PmInfo {
  name: PmName;
}

const KNOWN_PMS: PmName[] = ['pnpm', 'npm', 'yarn'];

export function detectPm(cwd = process.cwd()): PmInfo {
  const pkgPath = join(cwd, 'package.json');

  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

    if (pkg.packageManager) {
      const name = pkg.packageManager.split('@')[0] as PmName;

      if (KNOWN_PMS.includes(name)) {
        return { name };
      }
    }
  }

  if (existsSync(join(cwd, 'pnpm-lock.yaml'))) return { name: 'pnpm' };
  if (existsSync(join(cwd, 'package-lock.json'))) return { name: 'npm' };
  if (existsSync(join(cwd, 'yarn.lock'))) return { name: 'yarn' };

  return { name: 'npm' };
}
