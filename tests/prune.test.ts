import { mkdtempSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@vercel/nft', () => ({
  nodeFileTrace: vi.fn(),
}));

describe('prune', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'nft-docker-test-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('throws when no entrypoints given', async () => {
    const { prune } = await import('../src/commands/prune.mjs');

    await expect(prune([])).rejects.toThrow('usage: nft-docker prune --entrypoint <path>');
  });

  it('deletes non-traced files and keeps traced files', async () => {
    mkdirSync(join(tempDir, 'node_modules', 'pkg-a'), { recursive: true });
    mkdirSync(join(tempDir, 'node_modules', 'pkg-b'), { recursive: true });
    writeFileSync(join(tempDir, 'node_modules', 'pkg-a', 'index.js'), 'module.exports = "a"');
    writeFileSync(join(tempDir, 'node_modules', 'pkg-a', 'extra.js'), 'module.exports = "extra"');
    writeFileSync(join(tempDir, 'node_modules', 'pkg-b', 'index.js'), 'module.exports = "b"');
    writeFileSync(join(tempDir, 'entry.mjs'), 'import "pkg-a"');

    const { nodeFileTrace } = await import('@vercel/nft');

    vi.mocked(nodeFileTrace).mockResolvedValue({
      fileList: new Set(['entry.mjs', 'node_modules/pkg-a/index.js']),
      esmFileList: new Set(),
      reasons: new Map(),
      warnings: new Set(),
    });

    const { prune } = await import('../src/commands/prune.mjs');

    await prune(['./entry.mjs']);

    expect(existsSync(join(tempDir, 'node_modules', 'pkg-a', 'index.js'))).toBe(true);
    expect(existsSync(join(tempDir, 'node_modules', 'pkg-a', 'extra.js'))).toBe(false);
    expect(existsSync(join(tempDir, 'node_modules', 'pkg-b', 'index.js'))).toBe(false);
    expect(existsSync(join(tempDir, 'node_modules', 'pkg-b'))).toBe(false);
  });

  it('handles scoped packages', async () => {
    mkdirSync(join(tempDir, 'node_modules', '@scope', 'pkg'), { recursive: true });
    writeFileSync(join(tempDir, 'node_modules', '@scope', 'pkg', 'index.js'), 'export default 1');
    writeFileSync(join(tempDir, 'node_modules', '@scope', 'pkg', 'utils.js'), 'export default 2');
    writeFileSync(join(tempDir, 'entry.mjs'), '');

    const { nodeFileTrace } = await import('@vercel/nft');
    vi.mocked(nodeFileTrace).mockResolvedValue({
      fileList: new Set(['entry.mjs', 'node_modules/@scope/pkg/index.js']),
      esmFileList: new Set(),
      reasons: new Map(),
      warnings: new Set(),
    });

    const { prune } = await import('../src/commands/prune.mjs');
    await prune(['./entry.mjs']);

    expect(existsSync(join(tempDir, 'node_modules', '@scope', 'pkg', 'index.js'))).toBe(true);
    expect(existsSync(join(tempDir, 'node_modules', '@scope', 'pkg', 'utils.js'))).toBe(false);
  });
});
