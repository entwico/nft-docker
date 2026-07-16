import { readPackageJson } from './package-utils';
import type { DetectReason, ExternalReason } from './types';

// peerDependencies are intentionally NOT followed: peers are provided
// by the consumer and the closure will pick them up via consumer's deps.
export interface Closure {
  external: Set<string>;
  reasons: Map<string, ExternalReason[]>;
}

export function expandClosure(
  detectedPackages: Set<string>,
  detectedReasons: Map<string, DetectReason[]>,
  cwd: string,
  packageDirs?: Map<string, string>,
): Closure {
  const external = new Set(detectedPackages);
  const reasons = new Map<string, ExternalReason[]>();

  for (const [pkg, rs] of detectedReasons) {
    reasons.set(pkg, [...rs]);
  }

  const queue: string[] = [...detectedPackages];

  const enqueueDep = (dep: string, from: string): void => {
    if (external.has(dep)) return;

    external.add(dep);
    reasons.set(dep, [{ reachableFrom: from }]);
    queue.push(dep);
  };

  while (queue.length > 0) {
    const pkg = queue.shift()!;
    const json = readPackageJson(cwd, pkg, packageDirs);

    if (!json) continue;

    const deps = [...Object.keys(json.dependencies ?? {}), ...Object.keys(json.optionalDependencies ?? {})];

    for (const dep of deps) enqueueDep(dep, pkg);
  }

  return { external, reasons };
}
