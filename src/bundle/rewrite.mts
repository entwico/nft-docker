import { existsSync, readFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { rolldown } from 'rolldown';
import { classify } from './classify.mjs';
import { type Classification } from './types.mjs';

// resolves which packages must stay external during the rewrite
// - bundle ESM packages
// - CJS packages get externalized, since they break nft flow (get wrapped into undetectable shims)
export function externalMatcher(cwd: string): (id: string) => boolean {
  const cache = new Map<string, boolean>();

  function exportsExposesImport(node: any, depth = 0): boolean {
    if (depth > 32 || node === null || node === undefined) return false;

    if (typeof node === 'string') return false;

    if (Array.isArray(node)) return node.some((item) => exportsExposesImport(item, depth + 1));

    if (typeof node !== 'object') return false;

    for (const [key, value] of Object.entries(node)) {
      if (key === 'import') return true;
      if (exportsExposesImport(value, depth + 1)) return true;
    }

    return false;
  }

  function isPackageEsm(pkgRoot: string): boolean {
    const pkgJsonPath = findPackageJson(pkgRoot);

    if (!pkgJsonPath) return false;

    let pkgJson: any;

    try {
      pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
    } catch {
      return false;
    }

    if (pkgJson.type === 'module') return true;

    return exportsExposesImport(pkgJson.exports);
  }

  function findPackageJson(pkgRoot: string): string | null {
    let dir = cwd;

    while (true) {
      const candidate = join(dir, 'node_modules', pkgRoot, 'package.json');

      if (existsSync(candidate)) return candidate;

      const parent = dirname(dir);

      if (parent === dir) return null;

      dir = parent;
    }
  }

  function packageRoot(specifier: string): string {
    const segments = specifier.split('/');

    return specifier.startsWith('@') ? segments.slice(0, 2).join('/') : segments[0]!;
  }

  return (id: string): boolean => {
    if (id.startsWith('.') || id.startsWith('/')) return false;
    if (id.startsWith('node:')) return true;

    const pkgRoot = packageRoot(id);
    const cached = cache.get(pkgRoot);

    if (cached !== undefined) return cached;

    const result = !isPackageEsm(pkgRoot);

    cache.set(pkgRoot, result);

    return result;
  };
}

export interface RewriteOptions {
  entrypoints: string[];
  outDir: string;
  cwd: string;
  /** default true. set false for un-minified output (debugging only — bundling already breaks stack traces). */
  minify?: boolean;
  /** default true. set false to skip emitting `.mjs.map` files. */
  sourcemap?: boolean;
}

export interface RewriteResult {
  classification: Classification;
  outDir: string;
}

export async function rewrite(opts: RewriteOptions): Promise<RewriteResult> {
  // rolldown resolves a file's internal relative imports against its own
  // location only when the input path is absolute. relative inputs cause
  // `./chunks/foo.mjs` to be looked up under cwd instead.
  const absoluteEntries = opts.entrypoints.map((e) => resolve(opts.cwd, e));
  const classification = await classify(absoluteEntries, opts.cwd);

  const bundle = await rolldown({
    input: absoluteEntries,
    cwd: opts.cwd,
    external: externalMatcher(opts.cwd),
    platform: 'node',
    transform: {
      define: { 'process.env.NODE_ENV': '"production"' },
    },
  });

  await bundle.write({
    dir: opts.outDir,
    format: 'esm',
    entryFileNames: '[name].mjs',
    chunkFileNames: 'chunks/[name]-[hash].mjs',
    sourcemap: opts.sourcemap !== false,
    minify: opts.minify !== false,
  });

  await bundle.close();

  return { classification, outDir: opts.outDir };
}
