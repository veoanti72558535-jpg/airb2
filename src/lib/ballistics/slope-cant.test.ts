import { describe, it, expect } from 'vitest';
import { calculateTrajectory } from './engine';
import type { BallisticInput } from '../types';

const BASE_INPUT: BallisticInput = {
  muzzleVelocity: 280,
  bc: 0.025,
  projectileWeight: 18,
  sightHeight: 40,
  zeroRange: 30,
  maxRange: 100,
  rangeStep: 10,
  weather: {
    temperature: 20,
    humidity: 50,
    pressure: 1013,
    altitude: 0,
    windSpeed: 2,
    windAngle: 90,
    source: 'manual',
    timestamp: '2025-01-01T00:00:00Z',
  },
};

/** Get result row at a specific range. */
function rowAt(results: ReturnType<typeof calculateTrajectory>, range: number) {
  return results.find(r => r.range === range)!;
}

describe('Slope correction (Improved Rifleman\'s Rule)', () => {
  it('slopeAngleDeg = 0 → dropAfterSlope absent', () => {
    const res = calculateTrajectory({ ...BASE_INPUT, slopeAngleDeg: 0 });
    expect(rowAt(res, 50).dropAfterSlope).toBeUndefined();
  });

  it('slopeAngleDeg = 30° → dropAfterSlope ≈ drop × 0.75', () => {
    const base = calculateTrajectory(BASE_INPUT);
    const sloped = calculateTrajectory({ ...BASE_INPUT, slopeAngleDeg: 30 });
    const baseDrop = rowAt(base, 50).drop;
    const slopedDrop = rowAt(sloped, 50).dropAfterSlope!;
    expect(slopedDrop).toBeCloseTo(baseDrop * 0.75, 0);
  });

  it('slopeAngleDeg = -30° (downhill) → same as +30° (cos² is even)', () => {
    const up = calculateTrajectory({ ...BASE_INPUT, slopeAngleDeg: 30 });
    const down = calculateTrajectory({ ...BASE_INPUT, slopeAngleDeg: -30 });
    expect(rowAt(down, 50).dropAfterSlope).toBe(rowAt(up, 50).dropAfterSlope);
  });

  it('slopeAngleDeg = 45° → dropAfterSlope ≈ drop × 0.5', () => {
    const base = calculateTrajectory(BASE_INPUT);
    const sloped = calculateTrajectory({ ...BASE_INPUT, slopeAngleDeg: 45 });
    expect(rowAt(sloped, 50).dropAfterSlope).toBeCloseTo(rowAt(base, 50).drop * 0.5, 0);
  });
});

describe('Cant correction', () => {
  it('cantAngleDeg = 0 → cantWindageShift absent', () => {
    const res = calculateTrajectory({ ...BASE_INPUT, cantAngleDeg: 0 });
    expect(rowAt(res, 50).cantWindageShift).toBeUndefined();
  });

  it('cantAngleDeg = 5° → cantWindageShift ≈ -drop × sin(5°)', () => {
    const base = calculateTrajectory(BASE_INPUT);
    const canted = calculateTrajectory({ ...BASE_INPUT, cantAngleDeg: 5 });
    const drop = rowAt(base, 50).drop;
    const expected = -drop * Math.sin(5 * Math.PI / 180);
    expect(rowAt(canted, 50).cantWindageShift).toBeCloseTo(expected, 0);
  });

  it('cantAngleDeg = 10° → cantWindageShift ≈ -drop × sin(10°)', () => {
    const base = calculateTrajectory(BASE_INPUT);
    const canted = calculateTrajectory({ ...BASE_INPUT, cantAngleDeg: 10 });
    const drop = rowAt(base, 50).drop;
    const expected = -drop * Math.sin(10 * Math.PI / 180);
    expect(rowAt(canted, 50).cantWindageShift).toBeCloseTo(expected, 0);
  });

  it('cantAngleDeg negative → shift in opposite direction', () => {
    const right = calculateTrajectory({ ...BASE_INPUT, cantAngleDeg: 5 });
    const left = calculateTrajectory({ ...BASE_INPUT, cantAngleDeg: -5 });
    const r = rowAt(right, 50).cantWindageShift!;
    const l = rowAt(left, 50).cantWindageShift!;
    expect(Math.sign(r)).not.toBe(Math.sign(l));
    expect(Math.abs(r)).toBeCloseTo(Math.abs(l), 1);
  });
});

describe('Invariance & combined', () => {
  it('no slope/cant → results identical to base', () => {
    const a = calculateTrajectory(BASE_INPUT);
    const b = calculateTrajectory({ ...BASE_INPUT, slopeAngleDeg: undefined, cantAngleDeg: undefined });
    expect(a).toEqual(b);
  });

  it('slope + cant combined → windDrift total = base windDrift + cantWindageShift', () => {
    const base = calculateTrajectory(BASE_INPUT);
    const combined = calculateTrajectory({ ...BASE_INPUT, slopeAngleDeg: 30, cantAngleDeg: 5 });
    const rBase = rowAt(base, 50);
    const rComb = rowAt(combined, 50);
    // windDrift should include cant shift
    expect(rComb.windDrift).toBeCloseTo(rBase.windDrift + rComb.cantWindageShift!, 0);
  });
});