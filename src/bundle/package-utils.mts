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

// installable package name from a specifier: '@scope/pkg/sub' → '@scope/pkg', 'pkg/sub' → 'pkg'.
// null for relative, absolute, or `node:`-prefixed specifiers.
export function packageNameFromSpecifier(specifier: string): string | null {
  if (!specifier) return null;
  if (specifier.startsWith('.') || specifier.startsWith('/')) return null;
  if (specifier.startsWith('node:')) return null;

  const segments = specifier.split('/');

  if (specifier.startsWith('@')) {
    return segments.length >= 2 && segments[1] ? `${segments[0]}/${segments[1]}` : null;
  }

  return segments[0] || null;
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
