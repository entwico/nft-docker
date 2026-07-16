import { describe, it, expect } from 'vitest';
import { packageNameFromSpecifier, packageOfFile } from '../src/bundle/package-utils.mjs';

describe('packageOfFile', () => {
  it('extracts plain package name from hoisted layout', () => {
    expect(packageOfFile('node_modules/sharp/build/Release/sharp.node')).toBe('sharp');
  });

  it('extracts scoped package name', () => {
    expect(packageOfFile('node_modules/@opentelemetry/sdk-node/build/src/index.js')).toBe('@opentelemetry/sdk-node');
  });

  it('skips .pnpm virtual store and returns the leaf package', () => {
    expect(packageOfFile('node_modules/.pnpm/sharp@0.34.0/node_modules/sharp/build/Release/sharp.node')).toBe('sharp');
  });

  it('skips .pnpm virtual store with scoped leaf package', () => {
    expect(
      packageOfFile(
        'node_modules/.pnpm/@opentelemetry+sdk-node@0.55.0/node_modules/@opentelemetry/sdk-node/build/src/index.js',
      ),
    ).toBe('@opentelemetry/sdk-node');
  });

  it('skips .bin entries', () => {
    expect(packageOfFile('node_modules/.bin/tsc')).toBeNull();
  });

  it('returns null for paths outside node_modules', () => {
    expect(packageOfFile('src/index.ts')).toBeNull();
  });

  it('returns null for the empty path', () => {
    expect(packageOfFile('')).toBeNull();
  });
});

describe('packageNameFromSpecifier', () => {
  it('returns a plain package name unchanged', () => {
    expect(packageNameFromSpecifier('lodash')).toBe('lodash');
  });

  it('strips the subpath from a plain package specifier', () => {
    expect(packageNameFromSpecifier('pino/lib/transport.js')).toBe('pino');
  });

  it('keeps the scope and name of a scoped package', () => {
    expect(packageNameFromSpecifier('@opentelemetry/sdk-node')).toBe('@opentelemetry/sdk-node');
  });

  it('strips the subpath from a scoped package specifier', () => {
    expect(packageNameFromSpecifier('@opentelemetry/sdk-node/build/src/index.js')).toBe('@opentelemetry/sdk-node');
  });

  it('returns null for a scope with no package name', () => {
    expect(packageNameFromSpecifier('@opentelemetry')).toBeNull();
  });

  it('returns null for relative specifiers', () => {
    expect(packageNameFromSpecifier('./local.js')).toBeNull();
    expect(packageNameFromSpecifier('../up.js')).toBeNull();
  });

  it('returns null for absolute specifiers', () => {
    expect(packageNameFromSpecifier('/abs/path.js')).toBeNull();
  });

  it('returns null for node: builtins', () => {
    expect(packageNameFromSpecifier('node:fs')).toBeNull();
  });

  it('returns null for the empty specifier', () => {
    expect(packageNameFromSpecifier('')).toBeNull();
  });
});
