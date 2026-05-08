import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { expandClosure } from '../src/bundle/closure.mjs';
import { type DetectReason } from '../src/bundle/types.mjs';

function writePkg(cwd: string, name: string, json: object) {
  const dir = join(cwd, 'node_modules', name);

  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name, ...json }));
}

describe('expandClosure', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'closure-test-'));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('returns the seed unchanged when no deps are declared', () => {
    writePkg(tmp, 'sharp', {});

    const result = expandClosure(
      new Set(['sharp']),
      new Map<string, DetectReason[]>([['sharp', ['native-bindings']]]),
      tmp,
    );

    expect([...result.external].sort()).toEqual(['sharp']);
    expect(result.reasons.get('sharp')).toEqual(['native-bindings']);
  });

  it('walks dependencies transitively', () => {
    writePkg(tmp, 'pino', { dependencies: { 'thread-stream': '*', 'sonic-boom': '*' } });
    writePkg(tmp, 'thread-stream', { dependencies: { 'real-require': '*' } });
    writePkg(tmp, 'sonic-boom', {});
    writePkg(tmp, 'real-require', {});

    const result = expandClosure(new Set(['pino']), new Map<string, DetectReason[]>([['pino', ['nft-warning']]]), tmp);

    expect([...result.external].sort()).toEqual(['pino', 'real-require', 'sonic-boom', 'thread-stream']);
  });

  it('records reachableFrom reasons for transitively-pulled packages', () => {
    writePkg(tmp, 'pino', { dependencies: { 'thread-stream': '*' } });
    writePkg(tmp, 'thread-stream', {});

    const result = expandClosure(new Set(['pino']), new Map<string, DetectReason[]>([['pino', ['nft-warning']]]), tmp);

    expect(result.reasons.get('thread-stream')).toEqual([{ reachableFrom: 'pino' }]);
  });

  it('follows optionalDependencies', () => {
    writePkg(tmp, 'foo', { optionalDependencies: { 'bar-native': '*' } });
    writePkg(tmp, 'bar-native', {});

    const result = expandClosure(
      new Set(['foo']),
      new Map<string, DetectReason[]>([['foo', ['native-bindings']]]),
      tmp,
    );

    expect(result.external.has('bar-native')).toBe(true);
  });

  it('does NOT follow peerDependencies', () => {
    writePkg(tmp, 'foo', { peerDependencies: { react: '*' } });
    writePkg(tmp, 'react', {});

    const result = expandClosure(new Set(['foo']), new Map<string, DetectReason[]>([['foo', ['nft-warning']]]), tmp);

    expect(result.external.has('react')).toBe(false);
  });

  it('handles cycles without infinite loops', () => {
    writePkg(tmp, 'a', { dependencies: { b: '*' } });
    writePkg(tmp, 'b', { dependencies: { a: '*' } });

    const result = expandClosure(new Set(['a']), new Map<string, DetectReason[]>([['a', ['nft-warning']]]), tmp);

    expect([...result.external].sort()).toEqual(['a', 'b']);
  });

  it('still externalizes deps that are not installed (runtime resolver will fail loudly, beats silent inline)', () => {
    writePkg(tmp, 'foo', { dependencies: { 'never-installed': '*' } });

    const result = expandClosure(new Set(['foo']), new Map<string, DetectReason[]>([['foo', ['nft-warning']]]), tmp);

    expect([...result.external].sort()).toEqual(['foo', 'never-installed']);
  });

  it('handles scoped package names', () => {
    writePkg(tmp, '@otel/api', { dependencies: { '@otel/core': '*' } });
    writePkg(tmp, '@otel/core', {});

    const result = expandClosure(
      new Set(['@otel/api']),
      new Map<string, DetectReason[]>([['@otel/api', ['nft-warning']]]),
      tmp,
    );

    expect([...result.external].sort()).toEqual(['@otel/api', '@otel/core']);
  });
});
