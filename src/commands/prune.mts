import { readdir, rm, unlink, rmdir } from 'fs/promises';
import { dirname, join, resolve } from 'path';
import { nodeFileTrace } from '@vercel/nft';
import { resolveExternalRoots } from '../bundle/external-roots.mjs';
import { rewrite } from '../bundle/rewrite.mjs';
import { expandGlobs } from '../utils/expand-globs.mjs';

export interface PruneOptions {
  rewrite?: boolean;
  preserve?: string[];
  minify?: boolean;
  sourcemap?: boolean;
  verbose?: boolean;
}

export async function prune(entrypoints: string[], opts: PruneOptions = {}) {
  if (entrypoints.length === 0) {
    throw new Error('usage: nft-docker prune --entrypoint <path>');
  }

  const verbose = opts.verbose ?? false;
  const cwd = process.cwd();
  let traceEntries = entrypoints;
  let externalRoots: string[] = [];
  let forceExternal = new Set<string>();

  if (opts.rewrite) {
    const outDir = dirname(resolve(cwd, entrypoints[0]));

    if (verbose) {
      console.log('rewriting entrypoints:', entrypoints.join(', '));
      console.log('output dir:           ', outDir);
    } else {
      const label = entrypoints.length === 1 ? 'entry' : 'entries';

      console.log(`rewriting ${entrypoints.length} ${label} → ${outDir}`);
    }

    const { classification } = await rewrite({
      entrypoints,
      outDir,
      cwd,
      minify: opts.minify,
      sourcemap: opts.sourcemap,
    });

    const externalCount = classification.external.size;

    if (verbose) {
      console.log(`\nforce-external packages (${externalCount}):`);

      for (const pkg of [...classification.external].sort()) {
        const rs = classification.reasons.get(pkg) ?? [];
        const formatted = rs.map((r) => (typeof r === 'string' ? r : `via ${r.reachableFrom}`)).join(', ');

        console.log(`  ${pkg}  [${formatted}]`);
      }
    } else {
      console.log(`force-external: ${externalCount} packages`);
    }

    traceEntries = entrypoints.map((e) => resolve(cwd, e));
    externalRoots = resolveExternalRoots(classification.external, cwd);
    forceExternal = classification.external;

    if (verbose && externalRoots.length > 0) {
      const label = externalRoots.length === 1 ? 'root' : 'roots';

      console.log(`adding ${externalRoots.length} external package ${label} to NFT trace`);
    }

    if (verbose) console.log('');
  }

  const preserved = await expandGlobs(opts.preserve ?? [], cwd);

  if (preserved.length > 0) {
    const label = preserved.length === 1 ? 'file' : 'files';

    console.log(`preserving ${preserved.length} additional ${label} via --preserve`);
  }

  const allTraceInputs = [...traceEntries, ...externalRoots, ...preserved];

  if (verbose) {
    console.log('tracing entrypoints:', traceEntries.join(', '));
  }

  const result = await nodeFileTrace(allTraceInputs, { base: cwd });

  const tracedSet = new Set(
    [...result.fileList].filter((f) => f.startsWith('node_modules/') || f.includes('/node_modules/')),
  );

  const packages = new Set<string>();

  for (const f of tracedSet) {
    const match = f.match(/node_modules\/(@[^/]+\/[^/]+|[^/]+)/);

    if (match) packages.add(match[1]);
  }

  // node's resolver needs package.json for every enclosing package; NFT doesn't always emit it.
  for (const f of [...tracedSet]) {
    const segments = f.split('/');

    for (let i = 0; i < segments.length - 1; i++) {
      if (segments[i] !== 'node_modules') continue;

      const next = segments[i + 1];

      if (!next || next.startsWith('.')) continue;

      const pkgEnd = next.startsWith('@') ? i + 2 : i + 1;

      if (pkgEnd >= segments.length) continue;

      tracedSet.add(`${segments.slice(0, pkgEnd + 1).join('/')}/package.json`);
    }
  }

  // force-external packages have untraceable codepaths by definition; preserve them whole.
  const keepRoots = new Set<string>();

  for (const pkg of forceExternal) {
    keepRoots.add(`node_modules/${pkg}`);
  }

  const warningCount = result.warnings.size;

  if (verbose) {
    console.log('traced packages:', packages.size);
    console.log('traced files:', tracedSet.size);
    if (warningCount > 0) console.log('NFT warnings:', warningCount);

    console.log('\npackages:');
    [...packages].sort().forEach((p) => console.log(' ', p));

    console.log('\npruning non-traced files...');
  } else {
    const warnSuffix = warningCount > 0 ? `, ${warningCount} NFT warnings` : '';

    console.log(`traced ${packages.size} packages, ${tracedSet.size} files${warnSuffix}`);
  }

  const start = performance.now();
  let deleted = 0;
  const nmPath = join(cwd, 'node_modules');

  function isInsideKeepRoot(relativePath: string): boolean {
    for (const root of keepRoots) {
      if (relativePath === root || relativePath.startsWith(`${root}/`)) return true;
    }

    return false;
  }

  async function walkAndPrune(dir: string): Promise<boolean> {
    const entries = await readdir(dir, { withFileTypes: true });

    const results = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = join(dir, entry.name);
        const relativePath = fullPath.slice(cwd.length + 1);

        if (entry.isDirectory()) {
          if (keepRoots.has(relativePath)) return false;

          const empty = await walkAndPrune(fullPath);

          if (empty) {
            await rmdir(fullPath);

            return true;
          }

          return false;
        }

        if (isInsideKeepRoot(relativePath)) return false;

        if (!tracedSet.has(relativePath)) {
          await unlink(fullPath);

          deleted++;

          return true;
        }

        return false;
      }),
    );

    return results.every(Boolean);
  }

  await walkAndPrune(nmPath);

  // wipe @types/* packages, isn't always reliably traced (e.g. protobuf)
  const typesDir = join(nmPath, '@types');
  let typesDeleted = 0;

  try {
    const typesEntries = await readdir(typesDir);

    typesDeleted = typesEntries.length;

    await rm(typesDir, { recursive: true, force: true });
  } catch {
    // no @types dir — fine.
  }

  const elapsed = ((performance.now() - start) / 1000).toFixed(1);
  const parts = [`${deleted} files`];

  if (typesDeleted > 0) parts.push(`${typesDeleted} @types ${typesDeleted === 1 ? 'package' : 'packages'}`);

  console.log(`deleted ${parts.join(', ')} in ${elapsed}s`);
}
