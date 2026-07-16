import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { classify } from '../src/bundle/classify.mjs';

describe('classify recovers __require-only externals from bundled chunks', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'classify-bundle-'));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  function installPackage(pkg: string, json: Record<string, unknown> = {}) {
    const dir = join(tmp, 'node_modules', pkg);

    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: pkg, main: 'index.js', ...json }));
    writeFileSync(join(dir, 'index.js'), 'module.exports = {};');
  }

  it('detects a package reached only through rolldown __require and expands its closure', async () => {
    installPackage('exporter-proto', { dependencies: { 'otlp-transformer': '1.0.0' } });
    installPackage('otlp-transformer');

    const dist = join(tmp, 'dist', 'server');
    mkdirSync(join(dist, 'chunks'), { recursive: true });

    // the external is reachable only via the __require helper NFT doesn't follow.
    writeFileSync(join(dist, 'chunks', 'otel.mjs'), `export const init = () => __require("exporter-proto");`);
    writeFileSync(join(dist, 'entry.mjs'), `import { init } from './chunks/otel.mjs';\ninit();`);

    const { external } = await classify([join(dist, 'entry.mjs')], tmp);

    expect(external.has('exporter-proto')).toBe(true);
    expect(external.has('otlp-transformer')).toBe(true);
  });
});
