import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DEBUG_DIR = join(import.meta.dirname, '..', '..', 'debug');

function replacer(_key: string, value: unknown): unknown {
  if (value instanceof Set) return [...value];
  if (value instanceof Map) return Object.fromEntries(value);

  return value;
}

export function writeDebug(name: string, content: unknown): string {
  mkdirSync(DEBUG_DIR, { recursive: true });

  const path = join(DEBUG_DIR, name);
  const data = typeof content === 'string' ? content : JSON.stringify(content, replacer, 2);

  writeFileSync(path, data);

  return path;
}
