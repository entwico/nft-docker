import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { detectPm } from '../src/utils/detect-pm.mjs';

describe('detectPm', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'nft-docker-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('detects pnpm from packageManager field', () => {
    writeFileSync(join(tempDir, 'package.json'), JSON.stringify({ packageManager: 'pnpm@9.15.0' }));

    expect(detectPm(tempDir)).toEqual({ name: 'pnpm' });
  });

  it('detects npm from packageManager field', () => {
    writeFileSync(join(tempDir, 'package.json'), JSON.stringify({ packageManager: 'npm@10.0.0' }));

    expect(detectPm(tempDir)).toEqual({ name: 'npm' });
  });

  it('detects yarn from packageManager field', () => {
    writeFileSync(join(tempDir, 'package.json'), JSON.stringify({ packageManager: 'yarn@4.0.0' }));

    expect(detectPm(tempDir)).toEqual({ name: 'yarn' });
  });

  it('detects pnpm from lockfile', () => {
    writeFileSync(join(tempDir, 'package.json'), JSON.stringify({}));
    writeFileSync(join(tempDir, 'pnpm-lock.yaml'), '');

    expect(detectPm(tempDir)).toEqual({ name: 'pnpm' });
  });

  it('detects npm from lockfile', () => {
    writeFileSync(join(tempDir, 'package.json'), JSON.stringify({}));
    writeFileSync(join(tempDir, 'package-lock.json'), '{}');

    expect(detectPm(tempDir)).toEqual({ name: 'npm' });
  });

  it('detects yarn from lockfile', () => {
    writeFileSync(join(tempDir, 'package.json'), JSON.stringify({}));
    writeFileSync(join(tempDir, 'yarn.lock'), '');

    expect(detectPm(tempDir)).toEqual({ name: 'yarn' });
  });

  it('defaults to npm when nothing is detected', () => {
    writeFileSync(join(tempDir, 'package.json'), JSON.stringify({}));

    expect(detectPm(tempDir)).toEqual({ name: 'npm' });
  });

  it('defaults to npm when no package.json exists', () => {
    expect(detectPm(tempDir)).toEqual({ name: 'npm' });
  });

  it('ignores unknown package manager in packageManager field', () => {
    writeFileSync(join(tempDir, 'package.json'), JSON.stringify({ packageManager: 'bun@1.0.0' }));

    expect(detectPm(tempDir)).toEqual({ name: 'npm' });
  });

  it('prefers packageManager field over lockfile', () => {
    writeFileSync(join(tempDir, 'package.json'), JSON.stringify({ packageManager: 'npm@10.0.0' }));
    writeFileSync(join(tempDir, 'pnpm-lock.yaml'), '');

    expect(detectPm(tempDir)).toEqual({ name: 'npm' });
  });
});
