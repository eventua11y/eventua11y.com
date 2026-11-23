/**
 * Comparator: sorts items with a `dateStart` field in ascending
 * chronological order (earliest first).
 */
export function compareByDateAsc(
  a: { dateStart: string },
  b: { dateStart: string }
): number {
  return new Date(a.dateStart).getTime() - new Date(b.dateStart).getTime();
}
