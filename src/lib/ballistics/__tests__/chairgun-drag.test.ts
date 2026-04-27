/**
 * P3 — ChairGun drag table & retardation tests.
 */
import { describe, it, expect } from 'vitest';
import {
  cdFromChairgun,
  chairgunRetardation,
  CHAIRGUN_DRAG_TABLE,
  CHAIRGUN_SOUND_MS,
} from '../drag/chairgun-drag-table';
import { dragDecel } from '../drag/retardation';

describe('ChairGun drag table', () => {
  it('has 14 points sorted by Mach', () => {
    expect(CHAIRGUN_DRAG_TABLE.length).toBe(14);
    for (let i = 1; i < CHAIRGUN_DRAG_TABLE.length; i++) {
      expect(CHAIRGUN_DRAG_TABLE[i][0]).toBeGreaterThan(CHAIRGUN_DRAG_TABLE[i - 1][0]);
    }
  });

  it('returns exact table value at Mach 0', () => {
    expect(cdFromChairgun(0)).toBe(0.2629);
  });

  it('returns exact table value at Mach 1.0', () => {
    expect(cdFromChairgun(1.0)).toBe(0.3500);
  });

  it('clamps below Mach 0', () => {
    expect(cdFromChairgun(-0.1)).toBe(0.2629);
  });

  it('clamps above Mach 1', () => {
    expect(cdFromChairgun(1.5)).toBe(0.3500);
  });

  it('interpolates linearly between points', () => {
    // Midpoint between [0.50, 0.2032] and [0.55, 0.2020]
    const cd = cdFromChairgun(0.525);
    expect(cd).toBeCloseTo(0.2026, 4);
  });

  it('reaches the trough near Mach 0.55', () => {
    // Mach 0.55 should be the lowest Cd in the table
    const cd55 = cdFromChairgun(0.55);
    expect(cd55).toBe(0.2020);
    expect(cd55).toBeLessThan(cdFromChairgun(0.50));
    expect(cd55).toBeLessThan(cdFromChairgun(0.60));
  });

  it('uses CHAIRGUN_SOUND_MS = 340.3', () => {
    expect(CHAIRGUN_SOUND_MS).toBe(340.3);
  });
});

describe('chairgunRetardation', () => {
  it('uses (Cd / BC) * v formula', () => {
    const v = 280; // m/s
    const bc = 0.025;
    const mach = v / CHAIRGUN_SOUND_MS;
    const cd = cdFromChairgun(mach);
    const expected = (cd / bc) * v;
    expect(chairgunRetardation(v, bc)).toBeCloseTo(expected, 6);
  });

  it('returns higher retardation for lower BC', () => {
    const v = 250;
    const r1 = chairgunRetardation(v, 0.020);
    const r2 = chairgunRetardation(v, 0.030);
    expect(r1).toBeGreaterThan(r2); // Lower BC = more drag
  });
});

describe('dragDecel with chairgun-direct mode', () => {
  it('uses ChairGun formula when retardationMode is chairgun-direct', () => {
    const v = 280;
    const bc = 0.025;
    const result = dragDecel(v, bc, 1.0, 'G1', undefined, undefined, 'chairgun-direct');
    const expected = chairgunRetardation(v, bc);
    expect(result).toBeCloseTo(expected, 6);
  });

  it('ignores atmoFactor in chairgun-direct mode', () => {
    const v = 280;
    const bc = 0.025;
    const r1 = dragDecel(v, bc, 1.0, 'G1', undefined, undefined, 'chairgun-direct');
    const r2 = dragDecel(v, bc, 0.8, 'G1', undefined, undefined, 'chairgun-direct');
    // atmoFactor should not affect chairgun-direct
    expect(r1).toBeCloseTo(r2, 6);
  });

  it('uses standard formula when retardationMode is standard', () => {
    const v = 280;
    const bc = 0.025;
    const r1 = dragDecel(v, bc, 1.0, 'G1', undefined, undefined, 'standard');
    const r2 = dragDecel(v, bc, 0.8, 'G1', undefined, undefined, 'standard');
    // atmoFactor SHOULD affect standard mode
    expect(r1).not.toBeCloseTo(r2, 2);
  });

  it('uses standard formula when retardationMode is undefined', () => {
    const v = 280;
    const bc = 0.025;
    const r1 = dragDecel(v, bc, 1.0, 'G1');
    const r2 = dragDecel(v, bc, 1.0, 'G1', undefined, undefined, undefined);
    expect(r1).toBeCloseTo(r2, 10);
  });
});
