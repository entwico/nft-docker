import { readPackageJson } from './package-utils.mjs';
import { type DetectReason, type ExternalReason } from './types.mjs';

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
): Closure {
  const external = new Set(detectedPackages);
  const reasons = new Map<string, ExternalReason[]>();

  for (const [pkg, rs] of detectedReasons) {
    reasons.set(pkg, [...rs]);
  }

  const queue: string[] = [...detectedPackages];

  while (queue.length > 0) {
    const pkg = queue.shift()!;
    const json = readPackageJson(cwd, pkg);

    if (!json) continue;

    const deps = [...Object.keys(json.dependencies ?? {}), ...Object.keys(json.optionalDependencies ?? {})];

    for (const dep of deps) {
      if (external.has(dep)) continue;

      external.add(dep);
      reasons.set(dep, [{ reachableFrom: pkg }]);
      queue.push(dep);
    }
  }

  return { external, reasons };
}
