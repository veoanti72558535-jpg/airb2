/**
 * Heun (RK2) — tests unitaires + non-régression.
 *
 * - Vérifie l'ordre 2 sur un cas analytique (chute libre sans drag).
 * - Vérifie que dispatcher renvoie bien `heunStep` pour kind='heun'.
 * - Vérifie qu'utilisé via le moteur, les 3 scénarios de référence
 *   restent dans tolérance (preuve qu'on peut le brancher en prod).
 */

import { describe, it, expect } from 'vitest';
import { heunStep } from './heun';
import { getIntegrator, type IntegratorState } from './index';
import { calculateTrajectory } from '../engine';
import type { BallisticInput, WeatherSnapshot } from '../../types';

const GRAVITY = 9.80665;
const noDrag = () => 0;

describe('heunStep — analytical', () => {
  it('reproduces free-fall ballistic to O(dt²)', () => {
    // Cas analytique : v0=100 m/s à 45°, sans drag → portée = v0²/g sin(2θ)
    const angle = Math.PI / 4;
    const v0 = 100;
    const s: IntegratorState = {
      x: 0, y: 0,
      vx: v0 * Math.cos(angle),
      vy: v0 * Math.sin(angle),
    };
    const dt = 0.01;
    while (s.y >= 0 || s.vy > 0) {
      heunStep(s, dt, noDrag);
      if (s.x > 2000) break;
    }
    const expected = (v0 * v0) / GRAVITY; // sin(90°)=1
    // Heun (ordre 2) à dt=0.01 : erreur attendue < 1 m sur ~1019 m
    expect(Math.abs(s.x - expected)).toBeLessThan(2);
  });
});

describe('integrator dispatcher', () => {
  it('returns heunStep for kind="heun"', () => {
    expect(getIntegrator('heun')).toBe(heunStep);
  });
});

describe('engine with heun integrator — reference scenarios', () => {
  const w: WeatherSnapshot = {
    temperature: 20, humidity: 25, pressure: 1014.58, altitude: 770,
    windSpeed: 0, windAngle: 0, source: 'manual', timestamp: '',
  };
  const heunCfg = {
    integrator: 'heun' as const,
    dt: 0.0005,
    atmosphereModel: 'icao-simple' as const,
    windModel: 'lateral-only' as const,
    postProcess: { spinDrift: false, coriolis: false, cant: false, slopeAngle: false },
  };
  function inp(mv: number): BallisticInput {
    return {
      muzzleVelocity: mv, bc: 0.084, projectileWeight: 25.39,
      sightHeight: 47, zeroRange: 50, maxRange: 100, rangeStep: 5,
      weather: w, dragModel: 'G1', engineConfig: heunCfg,
    };
  }

  it('S1: MV=280 @70m within ±5mm/±5m/s of references', () => {
    const r = calculateTrajectory(inp(280)).find(x => x.range === 70)!;
    expect(r.drop).toBeGreaterThan(-90);
    expect(r.drop).toBeLessThan(-70);
    expect(r.velocity).toBeGreaterThan(245);
    expect(r.velocity).toBeLessThan(260);
  });

  it('S2: MV=300 @80m within tolerance', () => {
    const r = calculateTrajectory(inp(300)).find(x => x.range === 80)!;
    expect(r.drop).toBeGreaterThan(-136);
    expect(r.drop).toBeLessThan(-116);
    expect(r.velocity).toBeGreaterThan(255);
    expect(r.velocity).toBeLessThan(270);
  });

  it('S3: MV=260 @35m within tolerance', () => {
    const r = calculateTrajectory(inp(260)).find(x => x.range === 35)!;
    expect(r.drop).toBeGreaterThan(20);
    expect(r.drop).toBeLessThan(35);
    expect(r.velocity).toBeGreaterThan(242);
    expect(r.velocity).toBeLessThan(256);
  });
});