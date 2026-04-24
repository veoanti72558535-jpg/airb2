/**
 * G1 source switch — non-regression tests.
 *
 * Vérifie que :
 *  - sans `g1Source`, le moteur reste bit-exact (legacy piecewise)
 *  - `g1Source: 'chairgun-table'` change effectivement les drops
 *  - `g1Source` n'a aucun effet quand `dragModel !== 'G1'`
 *  - une `customDragTable` continue de primer sur `g1Source`
 */
import { describe, it, expect } from 'vitest';
import { calculateTrajectory } from './engine';
import type { BallisticInput, WeatherSnapshot } from '../types';

function w(): WeatherSnapshot {
  return {
    temperature: 15, humidity: 50, pressure: 1013.25, altitude: 0,
    windSpeed: 0, windAngle: 90, source: 'manual', timestamp: '2026-01-01',
  };
}

function baseInput(over: Partial<BallisticInput> = {}): BallisticInput {
  return {
    muzzleVelocity: 280,
    bc: 0.025,
    projectileWeight: 18,
    sightHeight: 47,
    zeroRange: 30,
    maxRange: 100,
    rangeStep: 10,
    weather: w(),
    dragModel: 'G1',
    ...over,
  };
}

describe('G1 source switch', () => {
  it('legacy is the default — undefined === explicit legacy-piecewise', () => {
    const a = calculateTrajectory(baseInput());
    const b = calculateTrajectory(baseInput({ g1Source: 'legacy-piecewise' }));
    expect(a).toEqual(b);
  });

  it('chairgun-table changes the drop at 100m vs legacy', () => {
    const legacy = calculateTrajectory(baseInput({ g1Source: 'legacy-piecewise' }));
    const chair = calculateTrajectory(baseInput({ g1Source: 'chairgun-table' }));
    const dLegacy = legacy.find(r => r.range === 100)!.drop;
    const dChair = chair.find(r => r.range === 100)!.drop;
    expect(Number.isFinite(dLegacy)).toBe(true);
    expect(Number.isFinite(dChair)).toBe(true);
    // Différence mesurable (au moins 0.5 mm) — sinon la bascule serait inutile.
    expect(Math.abs(dLegacy - dChair)).toBeGreaterThan(0.5);
  });

  it('chairgun-table is a no-op when dragModel is G7', () => {
    const a = calculateTrajectory(baseInput({ dragModel: 'G7', g1Source: 'legacy-piecewise' }));
    const b = calculateTrajectory(baseInput({ dragModel: 'G7', g1Source: 'chairgun-table' }));
    expect(a).toEqual(b);
  });

  it('customDragTable still wins over g1Source', () => {
    const custom = [
      { mach: 0, cd: 0.3 },
      { mach: 1, cd: 0.3 },
      { mach: 2, cd: 0.3 },
    ];
    const a = calculateTrajectory(baseInput({ customDragTable: custom, g1Source: 'legacy-piecewise' }));
    const b = calculateTrajectory(baseInput({ customDragTable: custom, g1Source: 'chairgun-table' }));
    expect(a).toEqual(b);
  });
});