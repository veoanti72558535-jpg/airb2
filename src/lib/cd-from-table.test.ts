import { describe, it, expect } from 'vitest';
import { cdFromTable } from '@/lib/ballistics';
import type { DragTablePoint } from '@/lib/types';

/**
 * Tests for the custom-drag-table sampler used when a projectile ships with
 * a measured Cd vs Mach curve (e.g. Doppler radar export).
 *
 * Invariants under test:
 *  1. Empty table returns 0 (engine fallback contract — never NaN).
 *  2. Inside the table range, Cd is linearly interpolated between the two
 *     surrounding points.
 *  3. Outside the table range, the nearest endpoint is returned (no
 *     extrapolation — measured curves should not be projected beyond their
 *     measured Mach window).
 *  4. Exact-point lookups return the stored Cd verbatim.
 *  5. Degenerate adjacent points sharing a Mach value don't divide-by-zero;
 *     the lower point's Cd is used.
 */

const SAMPLE: DragTablePoint[] = [
  { mach: 0.5, cd: 0.235 },
  { mach: 0.7, cd: 0.235 },
  { mach: 0.9, cd: 0.45 },
  { mach: 1.0, cd: 0.59 },
  { mach: 1.2, cd: 0.55 },
];

describe('cdFromTable — empty input', () => {
  it('returns 0 when the table is empty (engine fallback)', () => {
    expect(cdFromTable([], 0.8)).toBe(0);
  });
});

describe('cdFromTable — exact point lookups', () => {
  it.each(SAMPLE)('returns stored Cd at Mach $mach', ({ mach, cd }) => {
    expect(cdFromTable(SAMPLE, mach)).toBeCloseTo(cd, 10);
  });
});

describe('cdFromTable — linear interpolation', () => {
  it('interpolates the midpoint between two unequal Cds', () => {
    // Halfway between (0.9, 0.45) and (1.0, 0.59) → 0.52
    expect(cdFromTable(SAMPLE, 0.95)).toBeCloseTo(0.52, 6);
  });

  it('interpolates a 1/4 fractional position correctly', () => {
    // 25% of the way from (0.9, 0.45) to (1.0, 0.59) → 0.45 + 0.25 * 0.14
    expect(cdFromTable(SAMPLE, 0.925)).toBeCloseTo(0.485, 6);
  });

  it('interpolates a 3/4 fractional position correctly', () => {
    expect(cdFromTable(SAMPLE, 0.975)).toBeCloseTo(0.555, 6);
  });

  it('returns the constant Cd in a flat segment (Mach 0.5–0.7 = 0.235)', () => {
    expect(cdFromTable(SAMPLE, 0.6)).toBeCloseTo(0.235, 10);
    expect(cdFromTable(SAMPLE, 0.65)).toBeCloseTo(0.235, 10);
  });

  it('interpolates through a multi-segment span correctly', () => {
    // Between (1.0, 0.59) and (1.2, 0.55), midpoint should be 0.57
    expect(cdFromTable(SAMPLE, 1.1)).toBeCloseTo(0.57, 6);
  });
});

describe('cdFromTable — clamp at boundaries', () => {
  it('clamps to the first Cd when Mach is below the lower bound', () => {
    expect(cdFromTable(SAMPLE, 0.1)).toBe(0.235);
    expect(cdFromTable(SAMPLE, 0)).toBe(0.235);
    expect(cdFromTable(SAMPLE, -1)).toBe(0.235);
  });

  it('clamps to the last Cd when Mach is above the upper bound', () => {
    expect(cdFromTable(SAMPLE, 1.5)).toBe(0.55);
    expect(cdFromTable(SAMPLE, 3)).toBe(0.55);
  });

  it('returns the boundary value exactly at the lower edge', () => {
    expect(cdFromTable(SAMPLE, 0.5)).toBe(0.235);
  });

  it('returns the boundary value exactly at the upper edge', () => {
    expect(cdFromTable(SAMPLE, 1.2)).toBe(0.55);
  });
});

describe('cdFromTable — single-point table', () => {
  it('always returns that point Cd regardless of Mach', () => {
    const single: DragTablePoint[] = [{ mach: 0.8, cd: 0.4 }];
    expect(cdFromTable(single, 0.1)).toBe(0.4);
    expect(cdFromTable(single, 0.8)).toBe(0.4);
    expect(cdFromTable(single, 2)).toBe(0.4);
  });
});

describe('cdFromTable — degenerate adjacent points', () => {
  it('does not divide by zero when two consecutive Machs match', () => {
    const degenerate: DragTablePoint[] = [
      { mach: 0.5, cd: 0.2 },
      { mach: 0.8, cd: 0.3 },
      { mach: 0.8, cd: 0.5 },
      { mach: 1.0, cd: 0.6 },
    ];
    const v = cdFromTable(degenerate, 0.8);
    expect(Number.isFinite(v)).toBe(true);
    // Falls into the (0.5→0.8) segment first (mach <= b.mach), so we hit the
    // boundary exactly and get b.cd = 0.3 — the contract is "sane finite
    // value, no NaN", not a specific tie-break.
    expect(v).toBe(0.3);
  });
});

describe('cdFromTable — monotonicity within a segment', () => {
  it('produces monotonically increasing Cd across a rising segment', () => {
    // Across (0.9, 0.45) → (1.0, 0.59), Cd should rise as Mach rises.
    const samples = [0.9, 0.92, 0.94, 0.96, 0.98, 1.0].map(m => cdFromTable(SAMPLE, m));
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]).toBeGreaterThanOrEqual(samples[i - 1]);
    }
  });

  it('produces monotonically decreasing Cd across a falling segment', () => {
    // Across (1.0, 0.59) → (1.2, 0.55), Cd should fall as Mach rises.
    const samples = [1.0, 1.05, 1.1, 1.15, 1.2].map(m => cdFromTable(SAMPLE, m));
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]).toBeLessThanOrEqual(samples[i - 1]);
    }
  });
});
