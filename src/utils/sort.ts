// stable lexicographic (UTF-16 code-unit) comparator for string arrays, matching the
// default Array#sort order — pass to toSorted() so sorts are explicit and deterministic.
export function sortByString(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;

  return 0;
}
