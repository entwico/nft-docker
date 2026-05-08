import { existsSync, readFileSync, appendFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { detectPm } from '../utils/detect-pm.mjs';

const NPMRC_SETTING = 'node-linker=hoisted';
const NPMRC_HOISTED = /^\s*node-linker\s*=\s*hoisted\s*$/m;
const NPMRC_ANY_LINKER = /^\s*node-linker\s*=\s*(\S+)\s*$/m;

const YAML_SETTING = 'nodeLinker: hoisted';
const YAML_HOISTED = /^\s*nodeLinker\s*:\s*hoisted\s*$/m;
const YAML_ANY_LINKER = /^\s*nodeLinker\s*:\s*(\S+)\s*$/m;

export async function preinstall() {
  const pm = detectPm();

  if (pm.name !== 'pnpm') {
    console.log(`package manager is ${pm.name}, no linker patch needed`);

    return;
  }

  // pnpm 10 reads .npmrc
  patchNpmrc();
  // pnpm 11 reads pnpm-workspace.yaml
  patchWorkspaceYaml();
}

function patchNpmrc() {
  const path = join(process.cwd(), '.npmrc');

  if (!existsSync(path)) {
    writeFileSync(path, `${NPMRC_SETTING}\n`);
    console.log('created .npmrc with node-linker=hoisted');

    return;
  }

  const content = readFileSync(path, 'utf-8');

  if (NPMRC_HOISTED.test(content)) {
    console.log('.npmrc already has node-linker=hoisted');

    return;
  }

  const match = content.match(NPMRC_ANY_LINKER);

  if (match) {
    throw new Error(`.npmrc has node-linker=${match[1]}, but nft-docker requires node-linker=hoisted for pnpm`);
  }

  const separator = content.endsWith('\n') ? '' : '\n';

  appendFileSync(path, `${separator}${NPMRC_SETTING}\n`);
  console.log('appended node-linker=hoisted to existing .npmrc');
}

function patchWorkspaceYaml() {
  const path = join(process.cwd(), 'pnpm-workspace.yaml');

  if (!existsSync(path)) {
    writeFileSync(path, `${YAML_SETTING}\n`);
    console.log('created pnpm-workspace.yaml with nodeLinker: hoisted');

    return;
  }

  const content = readFileSync(path, 'utf-8');

  if (YAML_HOISTED.test(content)) {
    console.log('pnpm-workspace.yaml already has nodeLinker: hoisted');

    return;
  }

  const match = content.match(YAML_ANY_LINKER);

  if (match) {
    throw new Error(
      `pnpm-workspace.yaml has nodeLinker: ${match[1]}, but nft-docker requires nodeLinker: hoisted for pnpm`,
    );
  }

  const separator = content.endsWith('\n') ? '' : '\n';

  appendFileSync(path, `${separator}${YAML_SETTING}\n`);
  console.log('appended nodeLinker: hoisted to existing pnpm-workspace.yaml');
}
