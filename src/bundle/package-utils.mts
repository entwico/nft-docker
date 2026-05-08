import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const PKG_RE = /node_modules\/(@[^/]+\/[^/]+|[^/]+)/g;

// pnpm's symlink layout puts files under node_modules/.pnpm/<pkg>@<ver>/node_modules/<pkg>/...
// so a naive first-match grabs `.pnpm` instead of the real package.
// iterate and pick the last non-dot segment.
export function packageOfFile(file: string): string | null {
  let last: string | null = null;

  for (const m of file.matchAll(PKG_RE)) {
    const name = m[1];

    if (name.startsWith('.')) continue;

    last = name;
  }

  return last;
}

export function packageJsonPath(cwd: string, pkg: string): string {
  return join(cwd, 'node_modules', pkg, 'package.json');
}

export function packageExists(cwd: string, pkg: string): boolean {
  return existsSync(packageJsonPath(cwd, pkg));
}

export interface PackageJson {
  name?: string;
  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

export function readPackageJson(cwd: string, pkg: string): PackageJson | null {
  const path = packageJsonPath(cwd, pkg);

  if (!existsSync(path)) return null;

  return JSON.parse(readFileSync(path, 'utf-8')) as PackageJson;
}
