import { existsSync, readFileSync, appendFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { detectPm } from '../utils/detect-pm.mjs';

const SETTING = 'node-linker=hoisted';
const HOISTED_PATTERN = /^\s*node-linker\s*=\s*hoisted\s*$/m;
const ANY_NODE_LINKER_PATTERN = /^\s*node-linker\s*=\s*(\S+)\s*$/m;

export async function preinstall() {
  const pm = detectPm();

  if (pm.name !== 'pnpm') {
    console.log(`package manager is ${pm.name}, no .npmrc patch needed`);

    return;
  }

  const npmrcPath = join(process.cwd(), '.npmrc');

  if (existsSync(npmrcPath)) {
    const content = readFileSync(npmrcPath, 'utf-8');

    if (HOISTED_PATTERN.test(content)) {
      console.log('.npmrc already has node-linker=hoisted');

      return;
    }

    const match = content.match(ANY_NODE_LINKER_PATTERN);

    if (match) {
      throw new Error(`.npmrc has node-linker=${match[1]}, but nft-docker requires node-linker=hoisted for pnpm`);
    }

    const separator = content.endsWith('\n') ? '' : '\n';
    appendFileSync(npmrcPath, `${separator}${SETTING}\n`);
    console.log('appended node-linker=hoisted to existing .npmrc');
  } else {
    writeFileSync(npmrcPath, `${SETTING}\n`);
    console.log('created .npmrc with node-linker=hoisted');
  }
}
