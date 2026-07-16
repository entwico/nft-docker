import { nodeFileTrace } from '@vercel/nft';
import { expandClosure } from './closure';
import { detectExternals } from './detection';
import { indexTracedPackages } from './package-utils';
import type { Classification } from './types';

export async function classify(entrypoints: string[], cwd: string): Promise<Classification> {
  const trace = await nodeFileTrace(entrypoints, { base: cwd });
  const packageDirs = indexTracedPackages(trace.fileList, cwd);
  const detection = detectExternals(trace, cwd);
  const { external, reasons } = expandClosure(detection.packages, detection.reasons, cwd, packageDirs);

  return { external, reasons };
}
