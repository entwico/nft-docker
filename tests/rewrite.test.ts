import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { rewrite } from '../src/bundle/rewrite.mjs';

describe('rewrite preserves Function/Class .name through minification', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'rewrite-keep-names-'));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('keeps the inferred name of a class returned from a factory arrow', async () => {
    const src = join(tmp, 'src');
    mkdirSync(src, { recursive: true });
    writeFileSync(
      join(src, 'entry.mjs'),
      `
        const factory = () => class Session {};
        export const Cls = factory();
        export const fnName = (function namedFunction() {}).name;
      `,
    );

    const outDir = join(tmp, 'out');

    await rewrite({ entrypoints: [join(src, 'entry.mjs')], outDir, cwd: tmp });

    const mod = await import(pathToFileURL(join(outDir, 'entry.mjs')).href);

    expect(mod.Cls.name).toBe('Session');
    expect(mod.fnName).toBe('namedFunction');
  });
});
