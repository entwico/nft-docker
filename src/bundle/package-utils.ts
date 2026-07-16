import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

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

// map every package in an NFT trace to its real on-disk directory
export function indexTracedPackages(fileList: Iterable<string>, cwd: string): Map<string, string> {
  const dirs = new Map<string, string>();

  for (const file of fileList) {
    let match: RegExpMatchArray | null = null;

    for (const m of file.matchAll(/node_modules\/(@[^/]+\/[^/]+|[^/]+)/g)) {
      if (!m[1].startsWith('.')) match = m;
    }

    if (!match || match.index === undefined) continue;

    const name = match[1];
    const dir = join(cwd, file.slice(0, match.index + match[0].length));
    const existing = dirs.get(name);

    if (!existing || dir.length < existing.length) dirs.set(name, dir);
  }

  return dirs;
}

export interface PackageJson {
  name?: string;
  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

export function readPackageJson(cwd: string, pkg: string, packageDirs?: Map<string, string>): PackageJson | null {
  const dir = packageDirs?.get(pkg);
  const path = dir ? join(dir, 'package.json') : packageJsonPath(cwd, pkg);

  if (!existsSync(path)) return null;

  return JSON.parse(readFileSync(path, 'utf8')) as PackageJson;
}
