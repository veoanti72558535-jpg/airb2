import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBrandCounts } from '@/hooks/use-brand-counts';

interface Item { brand: string | null | undefined }

describe('useBrandCounts', () => {
  it('groups brands case-insensitively while keeping the first-seen casing', () => {
    const items: Item[] = [
      { brand: 'FX' },
      { brand: 'fx' },
      { brand: 'Fx' },
    ];
    const { result } = renderHook(() => useBrandCounts(items, i => i.brand));
    expect(result.current).toEqual([{ display: 'FX', count: 3 }]);
  });

  it('sorts by descending count, then alphabetically by display', () => {
    const items: Item[] = [
      { brand: 'Daystate' },
      { brand: 'FX' },
      { brand: 'FX' },
      { brand: 'AirArms' },
      { brand: 'Daystate' },
      { brand: 'Weihrauch' },
    ];
    const { result } = renderHook(() => useBrandCounts(items, i => i.brand));
    expect(result.current).toEqual([
      { display: 'Daystate', count: 2 },
      { display: 'FX', count: 2 },
      { display: 'AirArms', count: 1 },
      { display: 'Weihrauch', count: 1 },
    ]);
  });

  it('ignores empty, whitespace-only, null, and undefined brands', () => {
    const items: Item[] = [
      { brand: 'FX' },
      { brand: '' },
      { brand: '   ' },
      { brand: null },
      { brand: undefined },
      { brand: 'JSB' },
    ];
    const { result } = renderHook(() => useBrandCounts(items, i => i.brand));
    expect(result.current).toEqual([
      { display: 'FX', count: 1 },
      { display: 'JSB', count: 1 },
    ]);
  });

  it('trims surrounding whitespace before grouping', () => {
    const items: Item[] = [
      { brand: '  FX  ' },
      { brand: 'fx' },
    ];
    const { result } = renderHook(() => useBrandCounts(items, i => i.brand));
    expect(result.current).toEqual([{ display: 'FX', count: 2 }]);
  });

  it('returns an empty array for an empty input', () => {
    const { result } = renderHook(() => useBrandCounts<Item>([], i => i.brand));
    expect(result.current).toEqual([]);
  });

  it('memoizes the result when inputs are referentially stable', () => {
    const items: Item[] = [{ brand: 'FX' }];
    const getBrand = (i: Item) => i.brand;
    const { result, rerender } = renderHook(() =>
      useBrandCounts(items, getBrand),
    );
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
