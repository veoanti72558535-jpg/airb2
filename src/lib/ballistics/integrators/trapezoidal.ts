/**
 * Trapezoidal / Heun RK2 step — P2.
 *
 * Second-order explicit method:
 *   1. predictor: full Euler step
 *   2. corrector: average accelerations at start and predictor endpoint
 *
 * Truncation error is O(dt²) — at dt=1e-3 it matches Euler@dt=5e-4 in
 * accuracy with ~half the work, which is the perf justification for
 * bumping `dt` from 5e-4 (legacy) to 1e-3 (mero) in `MERO_PROFILE`.
 *
 * The implementation is allocation-free (mutates `s` in place) so the
 * hot loop in `engine.ts` stays GC-quiet.
 */

import type { IntegratorState, DecelFn } from './euler';

const GRAVITY = 9.80665;

export function trapezoidalStep(s: IntegratorState, dt: number, decelFn: DecelFn): void {
  const v0 = Math.sqrt(s.vx * s.vx + s.vy * s.vy);
  if (v0 < 1) return;

  // ── Predictor (full Euler) ─────────────────────────────────────────
  const decel0 = decelFn(v0);
  const ax0 = -(decel0 * s.vx) / v0;
  const ay0 = -GRAVITY - (decel0 * s.vy) / v0;

  const vxPred = s.vx + ax0 * dt;
  const vyPred = s.vy + ay0 * dt;

  // ── Corrector (average start & predicted accelerations) ────────────
  const vPred = Math.sqrt(vxPred * vxPred + vyPred * vyPred);
  if (vPred < 1) {
    // Predictor would stall the projectile — fall back to the Euler step
    // so we still make progress instead of freezing the loop.
    s.vx = vxPred;
    s.vy = vyPred;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    return;
  }
  const decel1 = decelFn(vPred);
  const ax1 = -(decel1 * vxPred) / vPred;
  const ay1 = -GRAVITY - (decel1 * vyPred) / vPred;

  const axAvg = 0.5 * (ax0 + ax1);
  const ayAvg = 0.5 * (ay0 + ay1);

  s.vx += axAvg * dt;
  s.vy += ayAvg * dt;
  // Position uses the *averaged* velocity over the interval — equivalent
  // to integrating v with the trapezoidal rule, consistent with the
  // velocity update.
  s.x += 0.5 * (s.vx + (s.vx - axAvg * dt)) * dt; // = (vx + vxOld)/2 * dt
  s.y += 0.5 * (s.vy + (s.vy - ayAvg * dt)) * dt;
}
