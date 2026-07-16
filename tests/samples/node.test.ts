import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { classify } from '../../src/bundle/classify';
import type { Classification } from '../../src/bundle/types';
import { writeDebug } from '../util/debug.js';

const ROOT = join(import.meta.dirname, '..', '..', 'samples', 'node-app');
const SERVER = join(ROOT, 'dist', 'server.js');
const WORKER = join(ROOT, 'dist', 'worker.js');

describe('classify samples/node-app', () => {
  let classification: Classification;

  beforeAll(async () => {
    if (!existsSync(SERVER)) {
      throw new Error(`${SERVER} not found — run 'pnpm test:sample:node' first.`);
    }

    classification = await classify([SERVER, WORKER], ROOT);

    writeDebug('classify-node.json', classification);
  });

  it('runs the full classify pipeline against the built node-app', () => {
    expect(classification.external).toBeInstanceOf(Set);
  });

  // require AST scan over user-code (not just node_modules):
  it.todo('classifies the dynamic-import target as external');
  it.todo('flags fork-target packages as external');
});
