import { resolve } from 'path';
import { rolldown } from 'rolldown';
import { classify } from './classify.mjs';
import { makeExternalMatcher } from './external-matcher.mjs';
import { type Classification } from './types.mjs';

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
  const isExternal = makeExternalMatcher(classification.external);

  const bundle = await rolldown({
    input: absoluteEntries,
    cwd: opts.cwd,
    external: isExternal,
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
