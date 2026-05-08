import { describe, it, expect } from 'vitest';
import { makeExternalMatcher, packageRoot } from '../src/bundle/external-matcher.mjs';

describe('packageRoot', () => {
  it('returns plain package name unchanged', () => {
    expect(packageRoot('lodash')).toBe('lodash');
  });

  it('strips subpath from plain package', () => {
    expect(packageRoot('lodash/upperFirst')).toBe('lodash');
  });

  it('returns scoped package as scope/name', () => {
    expect(packageRoot('@opentelemetry/api')).toBe('@opentelemetry/api');
  });

  it('strips subpath from scoped package', () => {
    expect(packageRoot('@opentelemetry/api/build/src/index.js')).toBe('@opentelemetry/api');
  });
});

describe('makeExternalMatcher', () => {
  const isExternal = makeExternalMatcher(new Set(['lodash', '@opentelemetry/api', 'pino']));

  it('matches a bare package name', () => {
    expect(isExternal('lodash')).toBe(true);
  });

  it('matches a subpath of an external package', () => {
    expect(isExternal('lodash/upperFirst')).toBe(true);
  });

  it('matches a deep subpath', () => {
    expect(isExternal('lodash/fp/curry')).toBe(true);
  });

  it('matches a scoped package and its subpaths', () => {
    expect(isExternal('@opentelemetry/api')).toBe(true);
    expect(isExternal('@opentelemetry/api/build/src/index.js')).toBe(true);
  });

  it('does not match a sibling-scoped package not in the set', () => {
    expect(isExternal('@opentelemetry/sdk-node')).toBe(false);
  });

  it('does not match a different package starting with the same letters', () => {
    expect(isExternal('lodash-es')).toBe(false);
  });

  it('treats node: built-ins as external', () => {
    expect(isExternal('node:fs')).toBe(true);
    expect(isExternal('node:worker_threads')).toBe(true);
  });

  it('treats relative imports as local (not external)', () => {
    expect(isExternal('./local')).toBe(false);
    expect(isExternal('../up/one')).toBe(false);
  });

  it('treats absolute paths as local (not external)', () => {
    expect(isExternal('/abs/path/file.mjs')).toBe(false);
  });
});
