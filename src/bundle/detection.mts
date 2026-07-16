import { isBuiltin } from 'module';
import { join } from 'path';
import { type NodeFileTraceResult } from '@vercel/nft';
import { scanBundleExternals, scanFile } from './ast-scan.mjs';
import { packageExists, packageNameFromSpecifier, packageOfFile } from './package-utils.mjs';
import { type DetectReason } from './types.mjs';

export interface Detection {
  packages: Set<string>;
  reasons: Map<string, DetectReason[]>;
}

export function detectExternals(trace: NodeFileTraceResult, cwd: string): Detection {
  const packages = new Set<string>();
  const reasons = new Map<string, DetectReason[]>();

  function add(pkg: string, reason: DetectReason) {
    packages.add(pkg);

    const existing = reasons.get(pkg);

    if (existing) {
      if (!existing.includes(reason)) existing.push(reason);
    } else {
      reasons.set(pkg, [reason]);
    }
  }

  for (const file of trace.fileList) {
    if (file.endsWith('.node')) {
      const pkg = packageOfFile(file);

      if (pkg) add(pkg, 'native-bindings');
    }
  }

  for (const w of trace.warnings) {
    const msg = w instanceof Error ? w.message : String(w);
    const pkg = packageOfWarningMessage(msg);

    if (pkg) add(pkg, 'nft-warning');
  }

  for (const file of trace.fileList) {
    if (!file.startsWith('node_modules/') && !file.includes('/node_modules/')) continue;
    if (!file.endsWith('.js') && !file.endsWith('.cjs') && !file.endsWith('.mjs')) continue;

    const pkg = packageOfFile(file);

    if (!pkg) continue;

    const fullPath = join(cwd, file);
    const found = scanFile(fullPath);

    for (const reason of found) add(pkg, reason);
  }

  for (const pkg of detectBundleExternals(trace, cwd)) {
    add(pkg, 'bundled-external');
  }

  return { packages, reasons };
}

// scan the app's own bundled chunks (outside node_modules) for installed packages
// referenced via rolldown's __require(...) helper that NFT never follows.
export function detectBundleExternals(trace: NodeFileTraceResult, cwd: string): Set<string> {
  const packages = new Set<string>();

  for (const file of trace.fileList) {
    if (file.startsWith('node_modules/') || file.includes('/node_modules/')) continue;
    if (!file.endsWith('.js') && !file.endsWith('.cjs') && !file.endsWith('.mjs')) continue;

    const fullPath = join(cwd, file);

    for (const spec of scanBundleExternals(fullPath)) {
      const pkg = packageNameFromSpecifier(spec);

      if (!pkg || isBuiltin(pkg)) continue;
      if (!packageExists(cwd, pkg)) continue;

      packages.add(pkg);
    }
  }

  return packages;
}

function packageOfWarningMessage(msg: string): string | null {
  const m = msg.match(/node_modules\/(@[^/]+\/[^/]+|[^/]+)/);

  return m ? m[1] : null;
}
