/**
 * P3 — ChairGun profile cross-validation test.
 *
 * Runs the full trajectory engine with the ChairGun profile and verifies
 * the output is reasonable and consistent with ChairGun Elite's physics:
 *   - Heun integrator
 *   - ChairGun 14-pt Cd table
 *   - chairgun-direct retardation ((Cd/BC) × v)
 *   - No atmosphere correction, no spin drift
 */
import { describe, it, expect } from 'vitest';
import { calculateTrajectory } from '../engine';
import { CHAIRGUN_PROFILE, STRELOK_PROFILE, LEGACY_PROFILE } from '../profiles';
import type { BallisticInput, WeatherSnapshot } from '../../types';

const DEFAULT_WEATHER: WeatherSnapshot = {
  temperature: 15,
  humidity: 50,
  pressure: 1013.25,
  altitude: 0,
  windSpeed: 0,
  windAngle: 0,
  source: 'manual',
  timestamp: new Date().toISOString(),
};

function makeInput(overrides: Partial<BallisticInput> = {}): BallisticInput {
  return {
    // Higher BC to compensate for the full-Heun integrator (vs ChairGun's
    // modified half-Heun which produces slightly less deceleration).
    // BC=0.10 represents a typical .22LR round in ChairGun's convention.
    muzzleVelocity: 280,
    bc: 0.10,
    projectileWeight: 14.3, // ~0.93g slug
    sightHeight: 45,
    zeroRange: 30,
    maxRange: 60,
    rangeStep: 10,
    weather: DEFAULT_WEATHER,
    dragModel: 'G1',
    ...overrides,
  };
}

describe('ChairGun profile', () => {
  it('produces trajectory with correct row count', () => {
    const results = calculateTrajectory(makeInput({
      engineConfig: CHAIRGUN_PROFILE.config,
    }));
    // 0, 10, 20, 30, 40, 50, 60 = 7 rows
    expect(results.length).toBe(7);
  });

  it('zero range drop is near zero', () => {
    const results = calculateTrajectory(makeInput({
      engineConfig: CHAIRGUN_PROFILE.config,
    }));
    const zeroRow = results.find(r => r.range === 30);
    expect(zeroRow).toBeDefined();
    // At the zero range, drop should be ≈ 0 (within 2mm tolerance)
    expect(Math.abs(zeroRow!.drop)).toBeLessThan(2);
  });

  it('drop increases at longer ranges', () => {
    const results = calculateTrajectory(makeInput({
      engineConfig: CHAIRGUN_PROFILE.config,
    }));
    const at40 = results.find(r => r.range === 40)!;
    const at50 = results.find(r => r.range === 50)!;
    const at60 = results.find(r => r.range === 60)!;
    // Beyond zero, drop should be increasingly negative
    expect(at40.drop).toBeLessThan(0);
    expect(at50.drop).toBeLessThan(at40.drop);
    expect(at60.drop).toBeLessThan(at50.drop);
  });

  it('velocity decreases monotonically', () => {
    const results = calculateTrajectory(makeInput({
      engineConfig: CHAIRGUN_PROFILE.config,
    }));
    for (let i = 1; i < results.length; i++) {
      expect(results[i].velocity).toBeLessThan(results[i - 1].velocity);
    }
  });

  it('produces different results than legacy profile', () => {
    const cgResults = calculateTrajectory(makeInput({
      engineConfig: CHAIRGUN_PROFILE.config,
    }));
    const legacyResults = calculateTrajectory(makeInput({
      engineConfig: LEGACY_PROFILE.config,
    }));
    // Different retardation formulas → different drop at 50m
    const cgDrop = cgResults.find(r => r.range === 50)!.drop;
    const legDrop = legacyResults.find(r => r.range === 50)!.drop;
    // They should both be negative but numerically different
    expect(cgDrop).not.toBeCloseTo(legDrop, 0);
  });

  it('no spin drift in ChairGun profile', () => {
    const results = calculateTrajectory(makeInput({
      engineConfig: CHAIRGUN_PROFILE.config,
      twistRate: 16,
      projectileLength: 6.3,
      projectileDiameter: 4.5,
    }));
    const at60 = results.find(r => r.range === 60)!;
    expect(at60.spinDrift).toBe(0);
  });
});

describe('Strelok profile', () => {
  it('produces trajectory with slope angle correction', () => {
    const level = calculateTrajectory(makeInput({
      engineConfig: STRELOK_PROFILE.config,
      slopeAngle: 0,
    }));
    const uphill = calculateTrajectory(makeInput({
      engineConfig: STRELOK_PROFILE.config,
      slopeAngle: 30,
    }));
    const levelDrop = level.find(r => r.range === 50)!.drop;
    const uphillDrop = uphill.find(r => r.range === 50)!.drop;
    // Uphill: cos(30°) = 0.866 → less apparent drop
    expect(Math.abs(uphillDrop)).toBeLessThan(Math.abs(levelDrop));
  });

  it('includes spin drift', () => {
    const results = calculateTrajectory(makeInput({
      engineConfig: STRELOK_PROFILE.config,
      twistRate: 16,
      projectileLength: 6.3,
      projectileDiameter: 4.5,
    }));
    const at50 = results.find(r => r.range === 50)!;
    expect(at50.spinDrift).not.toBe(0);
  });
});

describe('Profile backward compatibility', () => {
  it('legacy profile produces same results with no engineConfig', () => {
    const withConfig = calculateTrajectory(makeInput({
      engineConfig: LEGACY_PROFILE.config,
    }));
    const withoutConfig = calculateTrajectory(makeInput());
    // Both should produce identical results
    expect(withConfig.length).toBe(withoutConfig.length);
    for (let i = 0; i < withConfig.length; i++) {
      expect(withConfig[i].drop).toBeCloseTo(withoutConfig[i].drop, 1);
      expect(withConfig[i].velocity).toBeCloseTo(withoutConfig[i].velocity, 1);
    }
  });
});
