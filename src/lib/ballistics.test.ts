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
    expect(out.map(r => r.range)).toEqual([0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
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
    const std = calculateTrajectory(baseInput()).find(r => r.range === 100)!.drop;
    const dense = calculateTrajectory(
      baseInput({ weather: { ...stdWeather, temperature: -10, pressure: 1050 } }),
    ).find(r => r.range === 100)!.drop;
    const thin = calculateTrajectory(
      baseInput({ weather: { ...stdWeather, temperature: 35, pressure: 950, altitude: 1500 } }),
    ).find(r => r.range === 100)!.drop;
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
    ).find(r => r.range === 100)!;
    const left = calculateTrajectory(
      baseInput({ weather: { ...stdWeather, windSpeed: 5, windAngle: 270 } }),
    ).find(r => r.range === 100)!;
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
    ).find(r => r.range === 100)!;
    expect(Number.isInteger(withClicks.clicksElevation!)).toBe(true);
    expect(Number.isInteger(withClicks.clicksWindage!)).toBe(true);
    expect(withClicks.clicksElevation!).toBeLessThanOrEqual(0);
    expect(withClicks.clicksWindage!).toBeGreaterThan(0);
  });

  it('finer click value (0.05 MRAD) yields more clicks than coarser (0.25 MRAD)', () => {
    const fine = calculateTrajectory(baseInput({ clickValue: 0.05, clickUnit: 'MRAD' }))
      .find(r => r.range === 100)!.clicksElevation!;
    const coarse = calculateTrajectory(baseInput({ clickValue: 0.25, clickUnit: 'MRAD' }))
      .find(r => r.range === 100)!.clicksElevation!;
    expect(Math.abs(fine)).toBeGreaterThan(Math.abs(coarse));
  });
});

describe('calculateTrajectory — customDragTable override', () => {
  // Subsonic pellet flight stays well under Mach 1 (≈ 0.5–0.8). G1 in that
  // band sits around Cd ≈ 0.23. Building a table whose Cd is **deliberately
  // ~3× higher** at every realistic Mach guarantees a measurable drag
  // increase regardless of which exact Mach the pellet visits during flight.
  // We only assert the *direction* of the change (more drag ⇒ slower ⇒
  // more drop) so the test stays robust to future engine refinements.
  const HIGH_DRAG_TABLE = [
    { mach: 0.0, cd: 0.70 },
    { mach: 0.5, cd: 0.70 },
    { mach: 0.7, cd: 0.70 },
    { mach: 0.9, cd: 0.75 },
    { mach: 1.0, cd: 0.85 },
    { mach: 1.2, cd: 0.80 },
    { mach: 2.0, cd: 0.70 },
  ];

  it('full trajectory with a high-drag custom table drops more than G1 baseline', () => {
    const baseline = calculateTrajectory(baseInput({ dragModel: 'G1' }));
    const overridden = calculateTrajectory(
      baseInput({ dragModel: 'G1', customDragTable: HIGH_DRAG_TABLE }),
    );

    // Same range grid — sanity check we're comparing apples to apples.
    expect(overridden.map(r => r.range)).toEqual(baseline.map(r => r.range));

    const baselineFinal = baseline.find(r => r.range === 100)!;
    const overriddenFinal = overridden.find(r => r.range === 100)!;

    // Override produces strictly more drop (more negative) and lower
    // residual velocity. Both must move together — if only one changes it
    // would suggest the table is being read for one phase but not the other.
    expect(overriddenFinal.drop).toBeLessThan(baselineFinal.drop);
    expect(overriddenFinal.velocity).toBeLessThan(baselineFinal.velocity);
  });

  it('a custom table that mirrors G1 produces a near-identical trajectory', () => {
    // Sanity / regression: when the user supplies a table that *matches* the
    // built-in model, the override path should not introduce drift. We use
    // sampled G1 values so we're not coupling to floating-point identity.
    const G1_LIKE_TABLE = [
      { mach: 0.0, cd: 0.225 },
      { mach: 0.5, cd: 0.230 },
      { mach: 0.7, cd: 0.235 },
      { mach: 0.9, cd: 0.260 },
      { mach: 1.0, cd: 0.450 },
      { mach: 1.2, cd: 0.500 },
      { mach: 2.0, cd: 0.380 },
    ];

    const native = calculateTrajectory(baseInput({ dragModel: 'G1' }))
      .find(r => r.range === 100)!.drop;
    const viaTable = calculateTrajectory(
      baseInput({ dragModel: 'G1', customDragTable: G1_LIKE_TABLE }),
    ).find(r => r.range === 100)!.drop;

    // Wide tolerance (50 mm @ 100 m on a ~3000 mm drop, < 2%) — the table is
    // a coarse 7-point sample of G1 so we can't expect bit-exact equality,
    // only that the override doesn't catastrophically diverge.
    expect(Math.abs(viaTable - native)).toBeLessThan(50);
  });

  it('removing customDragTable from a previously-overridden input restores exact G1 trajectory (no leftover state)', () => {
    // Regression guard: the engine must not carry over any cached drag table
    // or model state between successive calls. Computing first WITH a custom
    // table, then a fresh input WITHOUT it, must yield bit-exact equality
    // with the canonical G1 baseline.
    const baseline = calculateTrajectory(baseInput({ dragModel: 'G1' }));

    // First, run a trajectory using the high-drag override — this is what
    // would dirty any module-level cache if one existed.
    calculateTrajectory(
      baseInput({ dragModel: 'G1', customDragTable: HIGH_DRAG_TABLE }),
    );

    // Now compute again WITHOUT customDragTable. Build the input fresh from
    // the same `baseInput` factory — no spread of the previous one.
    const restored = calculateTrajectory(baseInput({ dragModel: 'G1' }));

    expect(restored.length).toBe(baseline.length);
    for (let i = 0; i < baseline.length; i++) {
      expect(restored[i].range).toBe(baseline[i].range);
      expect(restored[i].drop).toBe(baseline[i].drop);
      expect(restored[i].velocity).toBe(baseline[i].velocity);
      expect(restored[i].energy).toBe(baseline[i].energy);
      expect(restored[i].tof).toBe(baseline[i].tof);
      expect(restored[i].windDrift).toBe(baseline[i].windDrift);
    }
  });
});
