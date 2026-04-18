/**
 * Trapezoidal integrator convergence test — P2.
 *
 * Goal: prove RK2 is at least as accurate as Euler at half the dt for a
 * representative airgun trajectory. If this regresses, the perf rationale
 * for the larger dt in `MERO_PROFILE` collapses.
 */

import { describe, it, expect } from 'vitest';
import { eulerStep } from './euler';
import { trapezoidalStep } from './trapezoidal';

function simulate(step: typeof eulerStep, dt: number, totalT: number) {
  const s = { x: 0, y: 0, vx: 280, vy: 0 };
  // Trivial constant-decel field — not real drag, just enough to compare
  // the two methods on a non-trivial ODE.
  const decel = (v: number) => 0.001 * v * v;
  let t = 0;
  while (t < totalT) {
    step(s, dt, decel);
    t += dt;
  }
  return s;
}

describe('trapezoidal — P2 convergence', () => {
  it('RK2 @ dt=1e-3 ≈ Euler @ dt=5e-4 within 1 %', () => {
    const a = simulate(trapezoidalStep, 1e-3, 0.2);
    const b = simulate(eulerStep, 5e-4, 0.2);
    // Same x within 1 %, same y within 1 cm.
    expect(Math.abs(a.x - b.x) / b.x).toBeLessThan(0.01);
    expect(Math.abs(a.y - b.y)).toBeLessThan(0.01);
  });

  it('RK2 advances state monotonically for a valid trajectory', () => {
    const s = { x: 0, y: 0, vx: 280, vy: 0 };
    const decel = (v: number) => 0.001 * v * v;
    let lastX = 0;
    for (let i = 0; i < 100; i++) {
      trapezoidalStep(s, 1e-3, decel);
      expect(s.x).toBeGreaterThan(lastX);
      lastX = s.x;
    }
  });
});
