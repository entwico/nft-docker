import { mkdtempSync, mkdirSync, writeFileSync, rmSync, realpathSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { externalMatcher } from '../src/bundle/rewrite.mjs';

describe('externalMatcher', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = realpathSync(mkdtempSync(join(tmpdir(), 'external-matcher-')));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  function writePkg(name: string, pkgJson: object) {
    const dir = join(tmp, 'node_modules', name);

    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name, ...pkgJson }));
  }

  it('keeps CJS packages external', () => {
    writePkg('legacy-cjs', { main: './index.js' });

    const isExternal = externalMatcher(tmp);

    expect(isExternal('legacy-cjs')).toBe(true);
  });

  it('bundles packages declared as ESM via type: module', () => {
    writePkg('modern-esm', { type: 'module', main: './index.js' });

    const isExternal = externalMatcher(tmp);

    expect(isExternal('modern-esm')).toBe(false);
  });

  it('bundles packages that expose an import condition in exports', () => {
    writePkg('dual', {
      exports: {
        '.': { import: './index.mjs', require: './index.cjs' },
      },
    });

    const isExternal = externalMatcher(tmp);

    expect(isExternal('dual')).toBe(false);
  });

  it('classifies packages whose exports map does not expose ./package.json', () => {
    // packages with strict `exports` maps (e.g. @sindresorhus/slugify, most
    // modern @radix-ui/*) make `require.resolve('<pkg>/package.json')` throw —
    // the matcher must read package.json directly from disk instead.
    writePkg('@strict/esm', {
      type: 'module',
      exports: { '.': './index.js' },
    });
    writePkg('@strict/cjs', {
      exports: { '.': './index.js' },
    });

    const isExternal = externalMatcher(tmp);

    expect(isExternal('@strict/esm')).toBe(false);
    expect(isExternal('@strict/cjs')).toBe(true);
  });

  it('keeps node: builtins external', () => {
    const isExternal = externalMatcher(tmp);

    expect(isExternal('node:fs')).toBe(true);
    expect(isExternal('node:path')).toBe(true);
  });

  it('bundles relative and absolute specifiers', () => {
    const isExternal = externalMatcher(tmp);

    expect(isExternal('./local.mjs')).toBe(false);
    expect(isExternal('/abs/path.mjs')).toBe(false);
  });

  it('treats subpath imports the same as their package root', () => {
    writePkg('pkg-with-subpath', { type: 'module' });

    const isExternal = externalMatcher(tmp);

    expect(isExternal('pkg-with-subpath/deep/inner.js')).toBe(false);
  });

  it('treats missing packages as external', () => {
    const isExternal = externalMatcher(tmp);

    expect(isExternal('not-installed')).toBe(true);
  });
});
