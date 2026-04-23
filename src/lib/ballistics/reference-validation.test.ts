/**
 * Reference validation tests — ENGINE_VERSION 2.
 *
 * Validates the corrected engine (LOS formula + DRAG_K = 0.00036) against
 * 3 independent scenarios cross-checked with ChairGun Elite, Strelok Pro,
 * and MERO.
 *
 * Common parameters:
 *   Projectile: JSB KnockOut 25.39gr, BC G1 = 0.084
 *   Sight height: 47 mm
 *   Zero: 50 m
 *   Atmosphere: 20°C, 1014.58 hPa, 25% RH, altitude 770 m
 */

import { describe, it, expect } from 'vitest';
import { calculateTrajectory } from './engine';
import type { BallisticInput, WeatherSnapshot } from '../types';

const refWeather: WeatherSnapshot = {
  temperature: 20,
  humidity: 25,
  pressure: 1014.58,
  altitude: 770,
  windSpeed: 0,
  windAngle: 0,
  source: 'manual',
  timestamp: '',
};

function refInput(mv: number): BallisticInput {
  return {
    muzzleVelocity: mv,
    bc: 0.084,
    projectileWeight: 25.39,
    sightHeight: 47,
    zeroRange: 50,
    maxRange: 100,
    rangeStep: 5,
    weather: refWeather,
    dragModel: 'G1',
  };
}

describe('reference validation — JSB KnockOut 25.39gr BC=0.084 zero=50m sH=47mm', () => {
  it('S1: MV=280 m/s @ 70m → drop ≈ -80mm, velocity ≈ 253 m/s', () => {
    const out = calculateTrajectory(refInput(280));
    const r70 = out.find(r => r.range === 70)!;
    expect(r70, 'missing range 70').toBeDefined();
    // Drop: engine gives -80.3mm (ref ChairGun -83mm, Δ<3mm)
    expect(r70.drop).toBeGreaterThan(-90);
    expect(r70.drop).toBeLessThan(-70);
    // Velocity: engine gives 252.9 m/s (ref 246, Δ≈3%)
    expect(r70.velocity).toBeGreaterThan(245);
    expect(r70.velocity).toBeLessThan(260);
  });

  it('S2: MV=300 m/s @ 80m → drop ≈ -126mm, velocity ≈ 262 m/s', () => {
    const out = calculateTrajectory(refInput(300));
    const r80 = out.find(r => r.range === 80)!;
    expect(r80, 'missing range 80').toBeDefined();
    // Drop: engine gives -126mm (ref ChairGun -129mm, Δ<3mm)
    expect(r80.drop).toBeGreaterThan(-136);
    expect(r80.drop).toBeLessThan(-116);
    // Velocity: engine gives 261.7 m/s (ref 255.6, Δ≈2.4%)
    expect(r80.velocity).toBeGreaterThan(255);
    expect(r80.velocity).toBeLessThan(270);
  });

  it('S3: MV=260 m/s @ 35m → drop ≈ +27mm, velocity ≈ 249 m/s', () => {
    const out = calculateTrajectory(refInput(260));
    const r35 = out.find(r => r.range === 35)!;
    expect(r35, 'missing range 35').toBeDefined();
    // Drop: engine gives +26.8mm (ref +28mm, Δ<2mm)
    expect(r35.drop).toBeGreaterThan(20);
    expect(r35.drop).toBeLessThan(35);
    // Velocity: engine gives 248.8 m/s (ref 244.6, Δ≈1.7%)
    expect(r35.velocity).toBeGreaterThan(242);
    expect(r35.velocity).toBeLessThan(256);
  });
});