import { describe, it, expect } from 'vitest';
import { calToken, buildCaliberCounts, CANONICAL_CALIBERS } from '@/lib/caliber';

describe('calToken', () => {
  it('extracts the leading dotted-decimal token from a stored caliber', () => {
    expect(calToken('.22 (5.5mm)')).toBe('.22');
    expect(calToken('.177 (4.5mm)')).toBe('.177');
    expect(calToken('.25')).toBe('.25');
    expect(calToken('.30 (7.62mm)')).toBe('.30');
  });

  it('returns "" for null, undefined, or empty input', () => {
    expect(calToken(null)).toBe('');
    expect(calToken(undefined)).toBe('');
    expect(calToken('')).toBe('');
  });

  it('returns "" when no dotted-decimal pattern is present', () => {
    expect(calToken('5.5mm')).toBe('.5'); // leading "." after a digit still matches — documents current regex behavior
    expect(calToken('unknown')).toBe('');
    expect(calToken('22')).toBe('');
  });

  it('captures only the first dotted-decimal occurrence', () => {
    expect(calToken('.22 vs .25')).toBe('.22');
  });
});

describe('buildCaliberCounts', () => {
  it('returns counts in the canonical order, regardless of insertion order', () => {
    const items = [
      { caliber: '.30 (7.62mm)' },
      { caliber: '.177 (4.5mm)' },
      { caliber: '.22 (5.5mm)' },
      { caliber: '.25 (6.35mm)' },
    ];
    const counts = buildCaliberCounts(items, x => x.caliber);
    expect(counts.map(c => c.value)).toEqual(['.177', '.22', '.25', '.30']);
    expect(counts.every(c => c.count === 1)).toBe(true);
  });

  it('aggregates counts per canonical caliber', () => {
    const items = [
      { caliber: '.22 (5.5mm)' },
      { caliber: '.22' },
      { caliber: '.177 (4.5mm)' },
    ];
    const counts = buildCaliberCounts(items, x => x.caliber);
    expect(counts).toEqual([
      { value: '.177', count: 1 },
      { value: '.22', count: 2 },
    ]);
  });

  it('excludes calibers with a zero count', () => {
    const items = [{ caliber: '.22 (5.5mm)' }];
    const counts = buildCaliberCounts(items, x => x.caliber);
    expect(counts.map(c => c.value)).toEqual(['.22']);
    expect(counts).toHaveLength(1);
  });

  it('ignores items with empty/null/undefined caliber and unparseable strings', () => {
    const items = [
      { caliber: '.22' },
      { caliber: '' },
      { caliber: null as string | null },
      { caliber: undefined as string | undefined },
      { caliber: 'unknown' },
    ];
    const counts = buildCaliberCounts(items, x => x.caliber);
    expect(counts).toEqual([{ value: '.22', count: 1 }]);
  });

  it('returns an empty array when no items match any canonical caliber', () => {
    expect(buildCaliberCounts([], (x: { caliber: string }) => x.caliber)).toEqual([]);
    expect(buildCaliberCounts([{ caliber: 'n/a' }], x => x.caliber)).toEqual([]);
  });

  it('exposes the canonical caliber list in the documented order', () => {
    expect(CANONICAL_CALIBERS).toEqual(['.177', '.22', '.25', '.30']);
  });
});
