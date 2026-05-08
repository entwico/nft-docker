import { isAbsolute } from 'path';

// rolldown's string-array `external` option matches exactly, so subpath
// imports like `lodash/upperFirst` slip back into the bundle. this
// matcher strips the subpath and checks the package root.
export function makeExternalMatcher(external: Set<string>): (id: string) => boolean {
  return (id: string): boolean => {
    if (id.startsWith('node:')) return true;
    if (isAbsolute(id)) return false;
    if (id.startsWith('.')) return false;

    return external.has(packageRoot(id));
  };
}

export function packageRoot(specifier: string): string {
  if (specifier.startsWith('@')) {
    return specifier.split('/').slice(0, 2).join('/');
  }

  return specifier.split('/')[0];
}
