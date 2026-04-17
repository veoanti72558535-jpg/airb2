/**
 * Canonical caliber tokens supported across the library (Airguns, Projectiles).
 * Stored caliber strings may include the metric equivalent (e.g. ".22 (5.5mm)"),
 * so we normalise to the leading ".NNN" token for grouping/filtering.
 */
export const CANONICAL_CALIBERS = ['.177', '.22', '.25', '.30'] as const;
export type CanonicalCaliber = typeof CANONICAL_CALIBERS[number];

/**
 * Extract the canonical caliber token (".177" / ".22" / ".25" / ".30")
 * from any stored caliber string. Returns '' when no leading dotted-decimal
 * is present.
 */
export function calToken(value: string | undefined | null): string {
  const m = (value ?? '').match(/\.\d+/);
  return m ? m[0] : '';
}

/**
 * Build a `{ value, count }` list of canonical calibers found in a collection,
 * preserving the canonical order and dropping zero-count entries.
 */
export function buildCaliberCounts<T>(
  items: T[],
  getCaliber: (item: T) => string | undefined | null,
): Array<{ value: CanonicalCaliber; count: number }> {
  const map = new Map<string, number>();
  items.forEach(item => {
    const c = calToken(getCaliber(item));
    if (!c) return;
    map.set(c, (map.get(c) ?? 0) + 1);
  });
  return CANONICAL_CALIBERS
    .map(c => ({ value: c, count: map.get(c) ?? 0 }))
    .filter(x => x.count > 0);
}
