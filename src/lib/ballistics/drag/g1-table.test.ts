import { describe, it, expect } from 'vitest';
import { cdFromG1Table, G1_DRAG_TABLE } from './g1-table';

describe('G1 ChairGun table (79 pts)', () => {
  it('exact value at Mach 0.5', () => {
    expect(cdFromG1Table(0.5)).toBeCloseTo(0.2032, 4);
  });

  it('linear interpolation between 0.8 and 0.825 at Mach 0.82', () => {
    // 0.82 = 0.8 + 0.02 = 4/5 of the [0.8, 0.825] interval
    // expected = 0.2546 + 0.8 * (0.2706 - 0.2546) = 0.2674
    expect(cdFromG1Table(0.82)).toBeCloseTo(0.2674, 4);
  });

  it('exact value at Mach 1.0', () => {
    expect(cdFromG1Table(1.0)).toBeCloseTo(0.4805, 4);
  });

  it('clamps below the lower bound', () => {
    expect(cdFromG1Table(-1)).toBe(G1_DRAG_TABLE[0][1]);
  });

  it('clamps above the upper bound', () => {
    expect(cdFromG1Table(99)).toBe(G1_DRAG_TABLE[G1_DRAG_TABLE.length - 1][1]);
  });

  it('table is sorted ascending by Mach', () => {
    for (let i = 1; i < G1_DRAG_TABLE.length; i++) {
      expect(G1_DRAG_TABLE[i][0]).toBeGreaterThan(G1_DRAG_TABLE[i - 1][0]);
    }
  });
});