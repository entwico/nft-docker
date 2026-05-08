import { describe, it, expect } from 'vitest';
import { detectExternals } from '../src/bundle/detection.mjs';

function trace(opts: { files?: string[]; warnings?: (string | Error)[] }) {
  return {
    fileList: new Set(opts.files ?? []),
    esmFileList: new Set<string>(),
    reasons: new Map(),
    warnings: new Set((opts.warnings ?? []).map((w) => (w instanceof Error ? w : new Error(w)))),
  } as Parameters<typeof detectExternals>[0];
}

describe('detectExternals', () => {
  it('returns empty detection for a clean trace', () => {
    const detection = detectExternals(trace({ files: ['node_modules/lodash/index.js'] }), '/nonexistent');

    expect(detection.packages.size).toBe(0);
  });

  it('flags packages shipping .node files as native-bindings', () => {
    const detection = detectExternals(
      trace({ files: ['node_modules/sharp/build/Release/sharp.node'] }),
      '/nonexistent',
    );

    expect(detection.packages.has('sharp')).toBe(true);
    expect(detection.reasons.get('sharp')).toEqual(['native-bindings']);
  });

  it('flags scoped packages with .node files', () => {
    const detection = detectExternals(
      trace({ files: ['node_modules/@scope/native/build/native.node'] }),
      '/nonexistent',
    );

    expect(detection.packages.has('@scope/native')).toBe(true);
  });

  it('flags packages mentioned in NFT warnings as nft-warning', () => {
    const detection = detectExternals(
      trace({ warnings: ['Cannot statically analyze require() in node_modules/pino/lib/transport.js'] }),
      '/nonexistent',
    );

    expect(detection.packages.has('pino')).toBe(true);
    expect(detection.reasons.get('pino')).toEqual(['nft-warning']);
  });

  it('merges reasons when a package is flagged by multiple signals', () => {
    const detection = detectExternals(
      trace({
        files: ['node_modules/sharp/build/Release/sharp.node'],
        warnings: ['Failed to resolve dependency in node_modules/sharp/lib/index.js'],
      }),
      '/nonexistent',
    );

    expect(detection.reasons.get('sharp')).toEqual(['native-bindings', 'nft-warning']);
  });

  it('ignores warnings that do not reference node_modules', () => {
    const detection = detectExternals(trace({ warnings: ['unrelated warning text'] }), '/nonexistent');

    expect(detection.packages.size).toBe(0);
  });

  it('does not double-count when the same warning fires twice', () => {
    const detection = detectExternals(
      trace({
        warnings: [
          'Cannot statically analyze require() in node_modules/pino/lib/transport.js',
          'Cannot statically analyze require() in node_modules/pino/lib/worker.js',
        ],
      }),
      '/nonexistent',
    );

    expect(detection.reasons.get('pino')).toEqual(['nft-warning']);
  });
});
