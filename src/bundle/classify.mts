import { nodeFileTrace } from '@vercel/nft';
import { expandClosure } from './closure.mjs';
import { detectExternals } from './detection.mjs';
import { type Classification } from './types.mjs';

export async function classify(entrypoints: string[], cwd: string): Promise<Classification> {
  const trace = await nodeFileTrace(entrypoints, { base: cwd });
  const detection = detectExternals(trace, cwd);
  const { external, reasons } = expandClosure(detection.packages, detection.reasons, cwd);

  return { external, reasons };
}
