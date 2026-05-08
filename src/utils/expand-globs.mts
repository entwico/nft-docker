import { glob } from 'fs/promises';
import { isAbsolute, join, relative } from 'path';

export async function expandGlobs(patterns: string[], cwd: string): Promise<string[]> {
  if (patterns.length === 0) return [];

  const out: string[] = [];

  for (const pattern of patterns) {
    const matched: string[] = [];

    for await (const entry of glob(pattern, { cwd, withFileTypes: true })) {
      if (!entry.isFile()) continue;

      const dir = entry.parentPath ?? cwd;
      const absolute = isAbsolute(dir) ? join(dir, entry.name) : join(cwd, dir, entry.name);
      matched.push(absolute);
    }

    if (matched.length === 0) {
      throw new Error(`--preserve pattern matched no files: ${pattern} (cwd: ${relative(process.cwd(), cwd) || '.'})`);
    }

    out.push(...matched);
  }

  return out;
}
