import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { preinstall } from '../src/commands/preinstall.mjs';

describe('preinstall', () => {
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

  it('creates .npmrc with node-linker=hoisted for pnpm', async () => {
    writeFileSync(join(tempDir, 'package.json'), JSON.stringify({ packageManager: 'pnpm@9.15.0' }));

    await preinstall();

    const content = readFileSync(join(tempDir, '.npmrc'), 'utf-8');

    expect(content).toBe('node-linker=hoisted\n');
  });

  it('appends node-linker=hoisted to existing .npmrc', async () => {
    writeFileSync(join(tempDir, 'package.json'), JSON.stringify({ packageManager: 'pnpm@9.15.0' }));
    writeFileSync(join(tempDir, '.npmrc'), 'shamefully-hoist=true\n');

    await preinstall();

    const content = readFileSync(join(tempDir, '.npmrc'), 'utf-8');

    expect(content).toBe('shamefully-hoist=true\nnode-linker=hoisted\n');
  });

  it('appends with newline separator when .npmrc does not end with newline', async () => {
    writeFileSync(join(tempDir, 'package.json'), JSON.stringify({ packageManager: 'pnpm@9.15.0' }));
    writeFileSync(join(tempDir, '.npmrc'), 'shamefully-hoist=true');

    await preinstall();

    const content = readFileSync(join(tempDir, '.npmrc'), 'utf-8');

    expect(content).toBe('shamefully-hoist=true\nnode-linker=hoisted\n');
  });

  it('skips if .npmrc already has node-linker=hoisted', async () => {
    writeFileSync(join(tempDir, 'package.json'), JSON.stringify({ packageManager: 'pnpm@9.15.0' }));
    writeFileSync(join(tempDir, '.npmrc'), 'node-linker=hoisted\n');

    await preinstall();

    const content = readFileSync(join(tempDir, '.npmrc'), 'utf-8');

    expect(content).toBe('node-linker=hoisted\n');
  });

  it('throws if node-linker is set to a non-hoisted value', async () => {
    writeFileSync(join(tempDir, 'package.json'), JSON.stringify({ packageManager: 'pnpm@9.15.0' }));
    writeFileSync(join(tempDir, '.npmrc'), 'node-linker=isolated\n');

    await expect(preinstall()).rejects.toThrow(
      '.npmrc has node-linker=isolated, but nft-docker requires node-linker=hoisted for pnpm',
    );
  });

  it('does nothing for npm', async () => {
    writeFileSync(join(tempDir, 'package.json'), JSON.stringify({ packageManager: 'npm@10.0.0' }));

    await preinstall();

    expect(existsSync(join(tempDir, '.npmrc'))).toBe(false);
  });

  it('does nothing for yarn', async () => {
    writeFileSync(join(tempDir, 'package.json'), JSON.stringify({ packageManager: 'yarn@4.0.0' }));

    await preinstall();

    expect(existsSync(join(tempDir, '.npmrc'))).toBe(false);
  });
});
