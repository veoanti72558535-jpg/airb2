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

const baseInput = (overrides: Partial<BallisticInput> = {}): BallisticInput => ({
  muzzleVelocity: 280, // m/s — typical .22 PCP
  bc: 0.025,
  projectileWeight: 18, // grains — JSB Hades-ish
  sightHeight: 40, // mm
  zeroRange: 30, // m
  maxRange: 100, // m
  rangeStep: 10, // m
  weather: stdWeather,
  ...overrides,
});

describe('calculateTrajectory — shape & invariants', () => {
  it('returns the muzzle row plus one row per range step (0, 10, 20, …, maxRange)', () => {
    const out = calculateTrajectory(baseInput());
    expect(out[0].range).toBe(0);
    expect(out.map(r => r.range)).toEqual([0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
  });

  it('drop at the muzzle equals -sightHeight (mm) and zero at the zero range', () => {
    const out = calculateTrajectory(baseInput({ sightHeight: 40, zeroRange: 30 }));
    expect(out[0].drop).toBeCloseTo(-40, 0);
    const zeroRow = out.find(r => r.range === 30)!;
    expect(Math.abs(zeroRow.drop)).toBeLessThan(2); // ≤ 2 mm at zero
  });

  it('velocity decreases monotonically with range', () => {
    const out = calculateTrajectory(baseInput());
    for (let i = 1; i < out.length; i++) {
      expect(out[i].velocity).toBeLessThanOrEqual(out[i - 1].velocity);
    }
    expect(out[out.length - 1].velocity).toBeLessThan(out[0].velocity);
  });

  it('muzzle energy matches ½ m v² (with grain → kg conversion)', () => {
    const out = calculateTrajectory(baseInput({ muzzleVelocity: 280, projectileWeight: 18 }));
    const massKg = 18 * 0.00006479891;
    const expected = 0.5 * massKg * 280 * 280;
    expect(out[0].energy).toBeCloseTo(expected, 2);
  });

  it('time of flight grows monotonically with range', () => {
    const out = calculateTrajectory(baseInput());
    for (let i = 1; i < out.length; i++) {
      expect(out[i].tof).toBeGreaterThanOrEqual(out[i - 1].tof);
    }
  });

  it('drop becomes increasingly negative past the zero range', () => {
    const out = calculateTrajectory(baseInput({ zeroRange: 30, maxRange: 100 }));
    const past = out.filter(r => r.range > 30);
    for (let i = 1; i < past.length; i++) {
      expect(past[i].drop).toBeLessThan(past[i - 1].drop);
    }
    expect(past[past.length - 1].drop).toBeLessThan(0);
  });
});

describe('calculateTrajectory — atmospheric corrections', () => {
  it('denser air (cold + high pressure) increases drop vs standard atmosphere', () => {
    const std = calculateTrajectory(baseInput());
    const dense = calculateTrajectory(
      baseInput({
        weather: { ...stdWeather, temperature: -10, pressure: 1050 },
      }),
    );
    const stdDrop = std.find(r => r.range === 100)!.drop;
    const denseDrop = dense.find(r => r.range === 100)!.drop;
    // More drag → more drop (drop is more negative)
    expect(denseDrop).toBeLessThan(stdDrop);
  });

  it('thinner air (hot + low pressure + altitude) reduces drop vs standard atmosphere', () => {
    const std = calculateTrajectory(baseInput());
    const thin = calculateTrajectory(
      baseInput({
        weather: { ...stdWeather, temperature: 35, pressure: 950, altitude: 1500 },
      }),
    );
    const stdDrop = std.find(r => r.range === 100)!.drop;
    const thinDrop = thin.find(r => r.range === 100)!.drop;
    expect(thinDrop).toBeGreaterThan(stdDrop);
  });

  it('higher humidity slightly reduces air density (less drop)', () => {
    const dry = calculateTrajectory(baseInput());
    const humid = calculateTrajectory(
      baseInput({ weather: { ...stdWeather, humidity: 95 } }),
    );
    const dryDrop = dry.find(r => r.range === 100)!.drop;
    const humidDrop = humid.find(r => r.range === 100)!.drop;
    // Humid air is less dense → less drag → less drop (drop closer to 0 / less negative)
    expect(humidDrop).toBeGreaterThanOrEqual(dryDrop);
  });

  it('standard atmosphere yields zero atmospheric correction (sanity)', () => {
    const out = calculateTrajectory(baseInput());
    // Just confirms the engine runs cleanly with ICAO standard inputs.
    expect(out.find(r => r.range === 100)).toBeDefined();
  });
});

describe('calculateTrajectory — wind drift', () => {
  it('no crosswind → zero lateral drift at all ranges', () => {
    const out = calculateTrajectory(baseInput());
    out.forEach(r => expect(r.windDrift).toBe(0));
  });

  it('right crosswind (90°) produces positive drift; left crosswind (270°) produces negative drift', () => {
    const right = calculateTrajectory(
      baseInput({ weather: { ...stdWeather, windSpeed: 5, windAngle: 90 } }),
    );
    const left = calculateTrajectory(
      baseInput({ weather: { ...stdWeather, windSpeed: 5, windAngle: 270 } }),
    );
    const r100 = right.find(r => r.range === 100)!;
    const l100 = left.find(r => r.range === 100)!;
    expect(r100.windDrift).toBeGreaterThan(0);
    expect(l100.windDrift).toBeLessThan(0);
    // Symmetric within rounding
    expect(Math.abs(r100.windDrift + l100.windDrift)).toBeLessThan(0.5);
  });

  it('pure headwind/tailwind (0°/180°) produces no lateral drift', () => {
    const head = calculateTrajectory(
      baseInput({ weather: { ...stdWeather, windSpeed: 5, windAngle: 0 } }),
    );
    const tail = calculateTrajectory(
      baseInput({ weather: { ...stdWeather, windSpeed: 5, windAngle: 180 } }),
    );
    head.forEach(r => expect(Math.abs(r.windDrift)).toBeLessThan(0.5));
    tail.forEach(r => expect(Math.abs(r.windDrift)).toBeLessThan(0.5));
  });
});

describe('calculateTrajectory — click conversions', () => {
  it('omits click outputs when clickValue/clickUnit are absent', () => {
    const out = calculateTrajectory(baseInput());
    out.slice(1).forEach(r => {
      expect(r.clicksElevation).toBeUndefined();
      expect(r.clicksWindage).toBeUndefined();
    });
  });

  it('produces integer click counts when clickValue + clickUnit are supplied', () => {
    const out = calculateTrajectory(
      baseInput({
        clickValue: 0.1,
        clickUnit: 'MRAD',
        weather: { ...stdWeather, windSpeed: 5, windAngle: 90 },
      }),
    );
    const r100 = out.find(r => r.range === 100)!;
    expect(Number.isInteger(r100.clicksElevation!)).toBe(true);
    expect(Number.isInteger(r100.clicksWindage!)).toBe(true);
    // Past zero, holdover is negative so elevation clicks should be ≤ 0
    expect(r100.clicksElevation!).toBeLessThanOrEqual(0);
    // Right crosswind → positive windage clicks
    expect(r100.clicksWindage!).toBeGreaterThan(0);
  });

  it('finer click value (0.05 MRAD) yields more clicks than coarser (0.25 MRAD) for the same correction', () => {
    const fine = calculateTrajectory(baseInput({ clickValue: 0.05, clickUnit: 'MRAD' }));
    const coarse = calculateTrajectory(baseInput({ clickValue: 0.25, clickUnit: 'MRAD' }));
    const f100 = fine.find(r => r.range === 100)!.clicksElevation!;
    const c100 = coarse.find(r => r.range === 100)!.clicksElevation!;
    // Both negative past zero; |fine| should be greater than |coarse|
    expect(Math.abs(f100)).toBeGreaterThan(Math.abs(c100));
  });
});
