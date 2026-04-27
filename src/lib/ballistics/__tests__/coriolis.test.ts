/**
 * P3 — Coriolis drift tests.
 */
import { describe, it, expect } from 'vitest';
import { coriolisLateralMm, coriolisVerticalMm } from '../coriolis';

describe('coriolisLateralMm', () => {
  it('returns 0 when latitude is undefined', () => {
    expect(coriolisLateralMm(280, 0.5, undefined, 0)).toBe(0);
  });

  it('returns 0 when TOF is 0', () => {
    expect(coriolisLateralMm(280, 0, 45, 0)).toBe(0);
  });

  it('returns 0 when velocity is 0', () => {
    expect(coriolisLateralMm(0, 0.5, 45, 0)).toBe(0);
  });

  it('returns positive drift in northern hemisphere', () => {
    const drift = coriolisLateralMm(280, 0.5, 45, 90);
    expect(drift).toBeGreaterThan(0);
  });

  it('returns negative drift in southern hemisphere', () => {
    const drift = coriolisLateralMm(280, 0.5, -45, 90);
    expect(drift).toBeLessThan(0);
  });

  it('is zero at the equator', () => {
    const drift = coriolisLateralMm(280, 0.5, 0, 90);
    expect(drift).toBeCloseTo(0, 10);
  });

  it('scales with TOF squared', () => {
    const d1 = coriolisLateralMm(280, 0.5, 45, 90);
    const d2 = coriolisLateralMm(280, 1.0, 45, 90);
    // TOF doubled → drift should quadruple
    expect(d2 / d1).toBeCloseTo(4, 1);
  });

  it('is small for airgun ranges (< 1 mm at 50m)', () => {
    // JSB Exact at 280 m/s, 50m ≈ 0.18s TOF, 45° latitude
    const drift = coriolisLateralMm(280, 0.18, 45, 90);
    expect(Math.abs(drift)).toBeLessThan(1);
  });
});

describe('coriolisVerticalMm', () => {
  it('returns 0 when azimuth is undefined', () => {
    expect(coriolisVerticalMm(280, 0.5, 45, undefined)).toBe(0);
  });

  it('is zero when shooting north (azimuth = 0)', () => {
    const drift = coriolisVerticalMm(280, 0.5, 45, 0);
    expect(drift).toBeCloseTo(0, 10);
  });

  it('is maximal when shooting east (azimuth = 90)', () => {
    const dEast = Math.abs(coriolisVerticalMm(280, 0.5, 45, 90));
    const dNorth = Math.abs(coriolisVerticalMm(280, 0.5, 45, 0));
    expect(dEast).toBeGreaterThan(dNorth);
  });
});
