import { mkdtempSync, mkdirSync, writeFileSync, rmSync, realpathSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolveExternalRoots } from '../src/bundle/external-roots.mjs';

describe('resolveExternalRoots', () => {
  let tmp: string;

  beforeEach(() => {
    // realpathSync resolves /var/folders → /private/var/folders on macOS so
    // expectations match what createRequire.resolve returns.
    tmp = realpathSync(mkdtempSync(join(tmpdir(), 'external-roots-')));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  function writePkg(name: string, json: object, files: Record<string, string> = {}) {
    const dir = join(tmp, 'node_modules', name);

    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name, ...json }));

    for (const [path, content] of Object.entries(files)) {
      const full = join(dir, path);

      mkdirSync(join(full, '..'), { recursive: true });
      writeFileSync(full, content);
    }
  }

  it('resolves a package with main field to the main file', () => {
    writePkg('foo', { main: './index.js' }, { 'index.js': 'module.exports = 1' });

    const roots = resolveExternalRoots(new Set(['foo']), tmp);

    expect(roots).toEqual([join(tmp, 'node_modules', 'foo', 'index.js')]);
  });

  it('resolves a scoped package', () => {
    writePkg('@scope/pkg', { main: './lib.js' }, { 'lib.js': 'module.exports = 1' });

    const roots = resolveExternalRoots(new Set(['@scope/pkg']), tmp);

    expect(roots).toEqual([join(tmp, 'node_modules', '@scope', 'pkg', 'lib.js')]);
  });

  it('falls back to package.json when resolve fails', () => {
    writePkg('weird', {});

    const roots = resolveExternalRoots(new Set(['weird']), tmp);

    expect(roots).toContain(join(tmp, 'node_modules', 'weird', 'package.json'));
  });

  it('skips packages that are not installed', () => {
    const roots = resolveExternalRoots(new Set(['ghost']), tmp);

    expect(roots).toEqual([]);
  });

  it('returns empty for empty input', () => {
    expect(resolveExternalRoots(new Set(), tmp)).toEqual([]);
  });
});
