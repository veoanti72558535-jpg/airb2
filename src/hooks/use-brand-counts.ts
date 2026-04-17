import { useMemo } from 'react';

export interface BrandCount {
  /** Original-cased brand name to display in chips. */
  display: string;
  /** Number of items matching this brand. */
  count: number;
}

/**
 * Build a brand-frequency list from a collection of items.
 * - Case-insensitive grouping (keeps the first-seen original casing).
 * - Empty/whitespace brands are ignored.
 * - Sorted by descending count, then alphabetically by display name.
 */
export function useBrandCounts<T>(
  items: T[],
  getBrand: (item: T) => string | undefined | null,
): BrandCount[] {
  return useMemo(() => {
    const map = new Map<string, BrandCount>();
    items.forEach(item => {
      const raw = (getBrand(item) ?? '').trim();
      if (!raw) return;
      const key = raw.toLowerCase();
      const existing = map.get(key);
      if (existing) existing.count++;
      else map.set(key, { display: raw, count: 1 });
    });
    return Array.from(map.values()).sort(
      (a, b) => b.count - a.count || a.display.localeCompare(b.display),
    );
  }, [items, getBrand]);
}
