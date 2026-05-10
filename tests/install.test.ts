import { execSync } from 'child_process';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

vi.mock('@vercel/nft', () => ({
  nodeFileTrace: vi.fn(),
}));

describe('install', () => {
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
    const { install } = await import('../src/commands/install.mjs');

    await expect(install([])).rejects.toThrow('usage: nft-docker install --entrypoint <path>');
  });

  it('runs frozen install with hoisted linker and prune for pnpm', async () => {
    writeFileSync(join(tempDir, 'package.json'), JSON.stringify({ packageManager: 'pnpm@9.15.0' }));
    mkdirSync(join(tempDir, 'node_modules', 'pkg-a'), { recursive: true });
    writeFileSync(join(tempDir, 'node_modules', 'pkg-a', 'index.js'), '');
    writeFileSync(join(tempDir, 'entry.mjs'), '');

    const { nodeFileTrace } = await import('@vercel/nft');
    vi.mocked(nodeFileTrace).mockResolvedValue({
      fileList: new Set(['entry.mjs', 'node_modules/pkg-a/index.js']),
      esmFileList: new Set(),
      reasons: new Map(),
      warnings: new Set(),
    });

    const { install } = await import('../src/commands/install.mjs');
    await install(['./entry.mjs']);

    expect(vi.mocked(execSync)).toHaveBeenCalledWith('pnpm install --frozen-lockfile --node-linker=hoisted', {
      stdio: 'inherit',
    });

    expect(vi.mocked(nodeFileTrace)).toHaveBeenCalledOnce();
    expect(vi.mocked(nodeFileTrace).mock.calls[0][0]).toEqual(['./entry.mjs']);
  });

  it('runs npm ci for npm projects', async () => {
    writeFileSync(join(tempDir, 'package.json'), JSON.stringify({ packageManager: 'npm@10.0.0' }));
    mkdirSync(join(tempDir, 'node_modules'), { recursive: true });
    writeFileSync(join(tempDir, 'entry.mjs'), '');

    const { nodeFileTrace } = await import('@vercel/nft');
    vi.mocked(nodeFileTrace).mockResolvedValue({
      fileList: new Set(['entry.mjs']),
      esmFileList: new Set(),
      reasons: new Map(),
      warnings: new Set(),
    });

    const { install } = await import('../src/commands/install.mjs');
    await install(['./entry.mjs']);

    expect(vi.mocked(execSync)).toHaveBeenCalledWith('npm ci', { stdio: 'inherit' });
  });
});
