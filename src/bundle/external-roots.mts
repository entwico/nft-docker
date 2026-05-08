import { existsSync } from 'fs';
import { createRequire } from 'module';
import { join } from 'path';

// rolldown wraps CJS requires in helpers (__require, __toESM) that NFT
// doesn't recognize as import edges, so externals from the bundled
// output are invisible to NFT's post-rewrite trace. this feeds them
// back to NFT as explicit roots.
export function resolveExternalRoots(external: Set<string>, cwd: string): string[] {
  const localRequire = createRequire(import.meta.url);
  const out: string[] = [];

  for (const pkg of external) {
    try {
      out.push(localRequire.resolve(pkg, { paths: [cwd] }));
    } catch {
      // no main / broken exports — fall back to package.json so the
      // package directory at least gets kept.
      const pkgJson = join(cwd, 'node_modules', pkg, 'package.json');

      if (existsSync(pkgJson)) out.push(pkgJson);
    }
  }

  return out;
}
