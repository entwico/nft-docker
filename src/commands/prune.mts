import { readdir, unlink, rmdir } from 'fs/promises';
import { join } from 'path';
import { nodeFileTrace } from '@vercel/nft';

export async function prune(entrypoints: string[]) {
  if (entrypoints.length === 0) {
    throw new Error('usage: nft-docker prune --entrypoint <path>');
  }

  const cwd = process.cwd();

  console.log('tracing entrypoints:', entrypoints.join(', '));

  const result = await nodeFileTrace(entrypoints, { base: cwd });

  const tracedSet = new Set(
    [...result.fileList].filter((f) => f.startsWith('node_modules/') || f.includes('/node_modules/')),
  );

  const packages = new Set<string>();

  for (const f of tracedSet) {
    const match = f.match(/node_modules\/(@[^/]+\/[^/]+|[^/]+)/);

    if (match) packages.add(match[1]);
  }

  console.log('traced packages:', packages.size);
  console.log('traced files:', tracedSet.size);

  console.log('\npackages:');

  [...packages].sort().forEach((p) => console.log(' ', p));

  console.log('\npruning non-traced files...');

  const start = performance.now();
  let deleted = 0;
  const nmPath = join(cwd, 'node_modules');

  async function walkAndPrune(dir: string): Promise<boolean> {
    const entries = await readdir(dir, { withFileTypes: true });

    const results = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = join(dir, entry.name);
        const relativePath = fullPath.slice(cwd.length + 1); // strip cwd + separator

        if (entry.isDirectory()) {
          const empty = await walkAndPrune(fullPath);

          if (empty) {
            await rmdir(fullPath);

            return true;
          }

          return false;
        }

        if (!tracedSet.has(relativePath)) {
          await unlink(fullPath);

          deleted++;

          return true;
        }

        return false;
      }),
    );

    // directory is empty if all children were removed
    return results.every(Boolean);
  }

  await walkAndPrune(nmPath);

  const elapsed = ((performance.now() - start) / 1000).toFixed(1);

  console.log(`\ndone. deleted ${deleted} files from node_modules in ${elapsed}s`);
}
