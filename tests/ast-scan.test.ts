import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { scanFile } from '../src/bundle/ast-scan.mjs';

describe('scanFile', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'ast-scan-test-'));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  function write(name: string, src: string): string {
    const path = join(tmp, name);

    writeFileSync(path, src);

    return path;
  }

  it('returns no reasons for inert source', () => {
    const path = write('a.js', 'export const x = 1;');

    expect(scanFile(path)).toEqual([]);
  });

  it('returns no reasons for missing files', () => {
    expect(scanFile(join(tmp, 'does-not-exist.js'))).toEqual([]);
  });

  it('flags new Worker(...) as ast-worker', () => {
    const path = write(
      'a.js',
      `import { Worker } from 'node:worker_threads';
       new Worker(new URL('./w.mjs', import.meta.url));`,
    );

    expect(scanFile(path)).toContain('ast-worker');
  });

  it('flags namespaced new worker_threads.Worker(...) as ast-worker', () => {
    const path = write(
      'a.cjs',
      `const wt = require('node:worker_threads');
       new wt.Worker('./w.cjs');`,
    );

    expect(scanFile(path)).toContain('ast-worker');
  });

  it('flags child_process.fork(...) as ast-fork', () => {
    const path = write(
      'a.js',
      `import cp from 'node:child_process';
       cp.fork('./worker.js');`,
    );

    expect(scanFile(path)).toContain('ast-fork');
  });

  it('flags Module.register(...) as ast-module-register', () => {
    const path = write(
      'a.js',
      `import { register } from 'node:module';
       Module.register('./hook.mjs', import.meta.url);`,
    );

    expect(scanFile(path)).toContain('ast-module-register');
  });

  it('flags eval(...) as ast-eval', () => {
    const path = write('a.js', `eval('1 + 1');`);

    expect(scanFile(path)).toContain('ast-eval');
  });

  it('flags new Function(...) as ast-eval', () => {
    const path = write('a.js', `new Function('return 1')();`);

    expect(scanFile(path)).toContain('ast-eval');
  });

  it('flags non-literal require(varName) as ast-dyn-require', () => {
    const path = write('a.cjs', `const name = process.env.X; require(name);`);

    expect(scanFile(path)).toContain('ast-dyn-require');
  });

  it('does NOT flag require("literal") as ast-dyn-require', () => {
    const path = write('a.cjs', `require('lodash');`);

    expect(scanFile(path)).not.toContain('ast-dyn-require');
  });

  it('flags non-literal import(varName) as ast-dyn-import', () => {
    const path = write('a.mjs', `const name = './x.mjs'; await import(name);`);

    expect(scanFile(path)).toContain('ast-dyn-import');
  });

  it('does NOT flag import("./literal") as ast-dyn-import', () => {
    const path = write('a.mjs', `await import('./x.mjs');`);

    expect(scanFile(path)).not.toContain('ast-dyn-import');
  });

  it('flags imports of import-in-the-middle as ast-loader-patch', () => {
    const path = write('a.mjs', `import { register } from 'import-in-the-middle';`);

    expect(scanFile(path)).toContain('ast-loader-patch');
  });

  it('flags require("require-in-the-middle") (literal CJS) as ast-loader-patch', () => {
    const path = write('a.cjs', `const Hook = require('require-in-the-middle');`);

    expect(scanFile(path)).toContain('ast-loader-patch');
  });

  it('flags imports of require-in-the-middle (ESM) as ast-loader-patch', () => {
    const path = write('a.mjs', `import Hook from 'require-in-the-middle';`);

    expect(scanFile(path)).toContain('ast-loader-patch');
  });

  it('flags imports of shimmer as ast-loader-patch', () => {
    const path = write('a.mjs', `import shimmer from 'shimmer';`);

    expect(scanFile(path)).toContain('ast-loader-patch');
  });

  it('flags imports of thread-stream as ast-worker (worker-spawn machinery)', () => {
    const path = write('a.mjs', `import ThreadStream from 'thread-stream';`);

    expect(scanFile(path)).toContain('ast-worker');
  });

  it('flags require("thread-stream") (literal CJS) as ast-worker', () => {
    const path = write('a.cjs', `const ThreadStream = require('thread-stream');`);

    expect(scanFile(path)).toContain('ast-worker');
  });

  it('flags imports of piscina as ast-worker', () => {
    const path = write('a.mjs', `import Piscina from 'piscina';`);

    expect(scanFile(path)).toContain('ast-worker');
  });

  it('does not flag substrings inside string literals or comments alone', () => {
    const path = write('a.js', `export const docs = "see how to use it"; // a perfectly innocent file`);

    expect(scanFile(path)).toEqual([]);
  });

  it('survives parse errors gracefully (returns empty)', () => {
    const path = write('a.js', `this is not valid javascript {{{`);

    expect(scanFile(path)).toEqual([]);
  });

  it('returns multiple distinct reasons when several patterns appear', () => {
    const path = write(
      'a.js',
      `import { Worker } from 'node:worker_threads';
       import 'shimmer';
       new Worker('./w.js');
       eval('x');`,
    );

    const reasons = scanFile(path);

    expect(reasons).toContain('ast-worker');
    expect(reasons).toContain('ast-loader-patch');
    expect(reasons).toContain('ast-eval');
  });
});
