import { readFileSync } from 'fs';
import { Parser } from 'acorn';
import { simple } from 'acorn-walk';
import { type DetectReason } from './types.mjs';

// substring pre-filter — files lacking any of these never get parsed.
const MARKERS = [
  'new Worker',
  '.fork(',
  'Module.register',
  'new Function',
  'eval(',
  'require(',
  'import(',
  'import-in-the-middle',
  'require-in-the-middle',
  'shimmer',
  'thread-stream',
  'piscina',
  'workerpool',
];

// importing/requiring any of these signals that the consuming package
// patches Node's module loader at runtime.
const LOADER_PATCHERS = new Set(['import-in-the-middle', 'require-in-the-middle', 'shimmer']);

// importing/requiring any of these signals that the consuming package
// spawns a worker thread, typically with a sibling file as the entry.
const WORKER_SPAWNERS = new Set(['thread-stream', 'piscina', 'workerpool']);

function reasonForSpecifier(name: string): DetectReason | null {
  if (LOADER_PATCHERS.has(name)) return 'ast-loader-patch';
  if (WORKER_SPAWNERS.has(name)) return 'ast-worker';

  return null;
}

export function scanFile(path: string): DetectReason[] {
  let source: string;

  try {
    source = readFileSync(path, 'utf-8');
  } catch {
    return [];
  }

  if (!MARKERS.some((m) => source.includes(m))) return [];

  let ast;

  try {
    ast = Parser.parse(source, {
      ecmaVersion: 'latest',
      sourceType: 'module',
      allowReturnOutsideFunction: true,
      allowHashBang: true,
      allowAwaitOutsideFunction: true,
      allowImportExportEverywhere: true,
    });
  } catch {
    try {
      ast = Parser.parse(source, {
        ecmaVersion: 'latest',
        sourceType: 'script',
        allowReturnOutsideFunction: true,
        allowHashBang: true,
      });
    } catch {
      return [];
    }
  }

  const reasons = new Set<DetectReason>();

  simple(ast, {
    NewExpression(node: any) {
      const callee = node.callee;

      if (!callee) return;

      if (callee.type === 'Identifier' && callee.name === 'Worker') {
        reasons.add('ast-worker');
      }

      if (callee.type === 'MemberExpression' && callee.property?.name === 'Worker') {
        reasons.add('ast-worker');
      }

      if (callee.type === 'Identifier' && callee.name === 'Function') {
        reasons.add('ast-eval');
      }
    },

    CallExpression(node: any) {
      const callee = node.callee;

      if (!callee) return;

      if (callee.type === 'MemberExpression' && callee.property?.name === 'fork') {
        reasons.add('ast-fork');
      }

      if (
        callee.type === 'MemberExpression' &&
        callee.object?.name === 'Module' &&
        callee.property?.name === 'register'
      ) {
        reasons.add('ast-module-register');
      }

      if (callee.type === 'Identifier' && callee.name === 'require') {
        const arg = node.arguments?.[0];

        if (!arg) return;

        if (arg.type === 'Literal' && typeof arg.value === 'string') {
          const r = reasonForSpecifier(arg.value);

          if (r) reasons.add(r);
        } else if (arg.type !== 'TemplateLiteral') {
          reasons.add('ast-dyn-require');
        }
      }

      if (callee.type === 'Identifier' && callee.name === 'eval') {
        reasons.add('ast-eval');
      }
    },

    // acorn 8 emits dynamic import() as ImportExpression with `source`,
    // not as CallExpression with callee.type === 'Import'.
    ImportExpression(node: any) {
      const arg = node.source;

      if (!arg) return;

      if (arg.type === 'Literal' && typeof arg.value === 'string') {
        const r = reasonForSpecifier(arg.value);

        if (r) reasons.add(r);
      } else if (arg.type !== 'TemplateLiteral') {
        reasons.add('ast-dyn-import');
      }
    },

    ImportDeclaration(node: any) {
      const src = node.source?.value;

      if (typeof src !== 'string') return;

      const r = reasonForSpecifier(src);

      if (r) reasons.add(r);
    },

    ExportAllDeclaration(node: any) {
      const src = node.source?.value;

      if (typeof src !== 'string') return;

      const r = reasonForSpecifier(src);

      if (r) reasons.add(r);
    },

    ExportNamedDeclaration(node: any) {
      const src = node.source?.value;

      if (typeof src !== 'string') return;

      const r = reasonForSpecifier(src);

      if (r) reasons.add(r);
    },
  });

  return [...reasons];
}
