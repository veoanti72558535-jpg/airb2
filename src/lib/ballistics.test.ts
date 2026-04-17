import { describe, it, expect } from 'vitest';
import { calculateTrajectory } from '@/lib/ballistics';
import type { BallisticInput, WeatherSnapshot } from '@/lib/types';

const stdWeather: WeatherSnapshot = {
  temperature: 15,
  humidity: 0,
  pressure: 1013.25,
  altitude: 0,
  windSpeed: 0,
  windAngle: 0,
  source: 'manual',
  timestamp: '',
};

// 100m maxRange preserves zero-solver convergence behaviour identical to production.
// Speed gain comes from collapsing 16 tests into 8 representative scenarios.
const baseInput = (overrides: Partial<BallisticInput> = {}): BallisticInput => ({
  muzzleVelocity: 280,
  bc: 0.025,
  projectileWeight: 18,
  sightHeight: 40,
  zeroRange: 30,
  maxRange: 100,
  rangeStep: 10,
  weather: stdWeather,
  ...overrides,
});

describe('calculateTrajectory — core invariants', () => {
  it('produces the expected range grid, muzzle drop = -sightHeight, zero ≈ 0 at zeroRange', () => {
    const out = calculateTrajectory(baseInput());
    expect(out.map(r => r.range)).toEqual([0, 10, 20, 30, 40, 50]);
    expect(out[0].drop).toBeCloseTo(-40, 0);
    expect(Math.abs(out.find(r => r.range === 30)!.drop)).toBeLessThan(2);
  });

  it('velocity decreases monotonically; ToF grows monotonically; muzzle energy = ½mv²', () => {
    const out = calculateTrajectory(baseInput());
    for (let i = 1; i < out.length; i++) {
      expect(out[i].velocity).toBeLessThanOrEqual(out[i - 1].velocity);
      expect(out[i].tof).toBeGreaterThanOrEqual(out[i - 1].tof);
    }
    const expected = 0.5 * (18 * 0.00006479891) * 280 * 280;
    expect(out[0].energy).toBeCloseTo(expected, 2);
  });

  it('drop becomes increasingly negative past the zero range', () => {
    const out = calculateTrajectory(baseInput());
    const past = out.filter(r => r.range > 30);
    for (let i = 1; i < past.length; i++) {
      expect(past[i].drop).toBeLessThan(past[i - 1].drop);
    }
  });
});

describe('calculateTrajectory — atmosphere', () => {
  it('denser air → more drop; thinner air → less drop (vs ICAO standard)', () => {
    const std = calculateTrajectory(baseInput()).find(r => r.range === 50)!.drop;
    const dense = calculateTrajectory(
      baseInput({ weather: { ...stdWeather, temperature: -10, pressure: 1050 } }),
    ).find(r => r.range === 50)!.drop;
    const thin = calculateTrajectory(
      baseInput({ weather: { ...stdWeather, temperature: 35, pressure: 950, altitude: 1500 } }),
    ).find(r => r.range === 50)!.drop;
    expect(dense).toBeLessThan(std);
    expect(thin).toBeGreaterThan(std);
  });
});

describe('calculateTrajectory — wind drift', () => {
  it('no wind → zero drift everywhere; head/tailwind → no lateral drift', () => {
    calculateTrajectory(baseInput()).forEach(r => expect(r.windDrift).toBe(0));
    const head = calculateTrajectory(
      baseInput({ weather: { ...stdWeather, windSpeed: 5, windAngle: 0 } }),
    );
    head.forEach(r => expect(Math.abs(r.windDrift)).toBeLessThan(0.5));
  });

  it('right (90°) and left (270°) crosswinds produce symmetric, opposite drift', () => {
    const right = calculateTrajectory(
      baseInput({ weather: { ...stdWeather, windSpeed: 5, windAngle: 90 } }),
    ).find(r => r.range === 50)!;
    const left = calculateTrajectory(
      baseInput({ weather: { ...stdWeather, windSpeed: 5, windAngle: 270 } }),
    ).find(r => r.range === 50)!;
    expect(right.windDrift).toBeGreaterThan(0);
    expect(left.windDrift).toBeLessThan(0);
    expect(Math.abs(right.windDrift + left.windDrift)).toBeLessThan(0.5);
  });
});

describe('calculateTrajectory — click conversions', () => {
  it('omits clicks without clickValue/Unit; emits integer clicks when supplied', () => {
    const noClicks = calculateTrajectory(baseInput());
    noClicks.slice(1).forEach(r => {
      expect(r.clicksElevation).toBeUndefined();
      expect(r.clicksWindage).toBeUndefined();
    });
    const withClicks = calculateTrajectory(
      baseInput({
        clickValue: 0.1,
        clickUnit: 'MRAD',
        weather: { ...stdWeather, windSpeed: 5, windAngle: 90 },
      }),
    ).find(r => r.range === 50)!;
    expect(Number.isInteger(withClicks.clicksElevation!)).toBe(true);
    expect(Number.isInteger(withClicks.clicksWindage!)).toBe(true);
    expect(withClicks.clicksElevation!).toBeLessThanOrEqual(0);
    expect(withClicks.clicksWindage!).toBeGreaterThan(0);
  });

  it('finer click value (0.05 MRAD) yields more clicks than coarser (0.25 MRAD)', () => {
    const fine = calculateTrajectory(baseInput({ clickValue: 0.05, clickUnit: 'MRAD' }))
      .find(r => r.range === 50)!.clicksElevation!;
    const coarse = calculateTrajectory(baseInput({ clickValue: 0.25, clickUnit: 'MRAD' }))
      .find(r => r.range === 50)!.clicksElevation!;
    expect(Math.abs(fine)).toBeGreaterThan(Math.abs(coarse));
  });
});
