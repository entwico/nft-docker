import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { expandGlobs } from '../src/utils/expand-globs';
import { sortByString } from '../src/utils/sort';

describe('expandGlobs', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'expand-globs-'));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('returns empty for empty patterns', async () => {
    expect(await expandGlobs([], tmp)).toEqual([]);
  });

  it('expands a literal path to itself', async () => {
    writeFileSync(join(tmp, 'foo.txt'), '');

    const out = await expandGlobs(['foo.txt'], tmp);

    expect(out).toEqual([join(tmp, 'foo.txt')]);
  });

  it('expands a single-star glob', async () => {
    writeFileSync(join(tmp, 'a.txt'), '');
    writeFileSync(join(tmp, 'b.txt'), '');
    writeFileSync(join(tmp, 'c.md'), '');

    const out = await expandGlobs(['*.txt'], tmp);

    expect(out.toSorted(sortByString)).toEqual([join(tmp, 'a.txt'), join(tmp, 'b.txt')]);
  });

  it('expands a recursive double-star glob', async () => {
    mkdirSync(join(tmp, 'node_modules', '@fontsource', 'poppins', 'files'), { recursive: true });
    writeFileSync(join(tmp, 'node_modules', '@fontsource', 'poppins', 'package.json'), '{}');
    writeFileSync(join(tmp, 'node_modules', '@fontsource', 'poppins', 'files', 'a.woff'), '');
    writeFileSync(join(tmp, 'node_modules', '@fontsource', 'poppins', 'files', 'b.woff'), '');

    const out = await expandGlobs(['node_modules/@fontsource/poppins/**'], tmp);

    expect(out.length).toBe(3);
  });

  it('expands multiple patterns and concatenates results', async () => {
    writeFileSync(join(tmp, 'a.txt'), '');
    writeFileSync(join(tmp, 'b.md'), '');

    const out = await expandGlobs(['*.txt', '*.md'], tmp);

    expect(out.toSorted(sortByString)).toEqual([join(tmp, 'a.txt'), join(tmp, 'b.md')]);
  });

  it('throws on a pattern that matches nothing', async () => {
    await expect(expandGlobs(['does-not-exist/*'], tmp)).rejects.toThrow(/matched no files/);
  });
});
