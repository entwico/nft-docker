import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface NodeRuntime {
  name: string;
  // node version to pin via a .prototools in the sample dir, or null to use ambient node
  // (CI, where the job matrix already selects the version).
  version: string | null;
  available: boolean;
}

const e2eRoot = fileURLToPath(new URL('.', import.meta.url));

// proto's node shim pins PROTO_NODE_VERSION for children, overriding the sample dir's
// .prototools — strip it so each child's cwd decides its node version.
export function childEnv(extra: Record<string, string> = {}): Record<string, string | undefined> {
  const env: Record<string, string | undefined> = {
    ...process.env,
    NODE_OPTIONS: '',
    PROTO_AUTO_INSTALL: 'false',
    ...extra,
  };

  delete env.PROTO_NODE_VERSION;

  return env;
}

// in CI the job matrix owns the node version, so run under ambient node. locally, if proto
// is present, offer one runtime per node-versions/<v> pin (skipping any not installed).
export function discoverRuntimes(): NodeRuntime[] {
  const protoShim = join(homedir(), '.proto', 'shims', 'node');
  const versionsDir = join(e2eRoot, 'node-versions');

  if (process.env.CI || !existsSync(protoShim)) {
    return [{ name: `node ${process.versions.node} (ambient)`, version: null, available: true }];
  }

  return readdirSync(versionsDir)
    .sort((a, b) => a.localeCompare(b))
    .map((version) => {
      try {
        const resolved = execFileSync(protoShim, ['--version'], {
          cwd: join(versionsDir, version),
          timeout: 30_000,
          env: childEnv(),
        })
          .toString()
          .trim();

        return { name: `node ${version} (${resolved})`, version, available: true };
      } catch {
        return { name: `node ${version} (unavailable)`, version, available: false };
      }
    });
}
