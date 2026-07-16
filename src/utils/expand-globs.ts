import { glob } from 'node:fs/promises';
import { isAbsolute, join, relative } from 'node:path';

async function matchPattern(pattern: string, cwd: string): Promise<string[]> {
  const matched: string[] = [];
  const entries = glob(pattern, { cwd, withFileTypes: true });

  for await (const entry of entries) {
    if (!entry.isFile()) continue;

    const dir = entry.parentPath ?? cwd;
    matched.push(isAbsolute(dir) ? join(dir, entry.name) : join(cwd, dir, entry.name));
  }

  return matched;
}

export async function expandGlobs(patterns: string[], cwd: string): Promise<string[]> {
  if (patterns.length === 0) return [];

  const out: string[] = [];

  for (const pattern of patterns) {
    const matched = await matchPattern(pattern, cwd);

    if (matched.length === 0) {
      throw new Error(`--preserve pattern matched no files: ${pattern} (cwd: ${relative(process.cwd(), cwd) || '.'})`);
    }

    out.push(...matched);
  }

  return out;
}
