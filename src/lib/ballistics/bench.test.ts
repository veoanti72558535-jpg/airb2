/**
 * Performance benchmark — P2.
 *
 * Mesure la médiane sur 20 runs pour les profils legacy et mero.
 * Plafonds durs (échec si dépassement) :
 *   - legacy : 50 ms / trajectoire 200 m pas 10 m
 *   - mero   : 90 ms / même trajectoire
 *
 * Cibles informatives (warning console seulement) :
 *   - legacy : 30 ms
 *   - mero   : 60 ms
 *
 * Les médianes sont imprimées dans la console pour suivi continu.
 */

import { describe, it, expect } from 'vitest';
import { calculateTrajectory } from './engine';
import { MERO_PROFILE } from './profiles';
import type { BallisticInput } from '../types';

const STD_WEATHER = {
  temperature: 15, humidity: 0, pressure: 1013.25, altitude: 0,
  windSpeed: 0, windAngle: 0, source: 'manual' as const, timestamp: '',
};

const BENCH_INPUT: BallisticInput = {
  muzzleVelocity: 280, bc: 0.025, projectileWeight: 18, sightHeight: 40,
  zeroRange: 30, maxRange: 200, rangeStep: 10, weather: STD_WEATHER, dragModel: 'G1',
};

const RUNS = 20;

function median(arr: number[]): number {
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function bench(label: string, input: BallisticInput): number {
  const times: number[] = [];
  // Warmup
  for (let i = 0; i < 3; i++) calculateTrajectory(input);
  for (let i = 0; i < RUNS; i++) {
    const t0 = performance.now();
    calculateTrajectory(input);
    times.push(performance.now() - t0);
  }
  const med = median(times);
  const min = Math.min(...times);
  const max = Math.max(...times);
  // eslint-disable-next-line no-console
  console.log(
    `[bench] ${label.padEnd(8)} median=${med.toFixed(2)}ms  min=${min.toFixed(2)}ms  max=${max.toFixed(2)}ms  (${RUNS} runs)`,
  );
  return med;
}

describe('engine — P2 perf bench', () => {
  it('legacy median < 50 ms (target 30 ms)', () => {
    const med = bench('legacy', BENCH_INPUT);
    if (med > 30) {
      // eslint-disable-next-line no-console
      console.warn(`[bench] legacy ${med.toFixed(2)}ms exceeds soft target 30ms`);
    }
    expect(med).toBeLessThan(50);
  });

  it('mero median < 90 ms (target 60 ms)', () => {
    const med = bench('mero', { ...BENCH_INPUT, engineConfig: MERO_PROFILE.config });
    if (med > 60) {
      // eslint-disable-next-line no-console
      console.warn(`[bench] mero ${med.toFixed(2)}ms exceeds soft target 60ms`);
    }
    expect(med).toBeLessThan(90);
  });
});
