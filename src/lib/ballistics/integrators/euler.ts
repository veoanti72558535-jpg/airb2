/**
 * Forward Euler step — P2 extraction.
 *
 * The core flight loop has always been first-order Euler. P2 isolates one
 * step into a pure function so the same loop body can be swapped for the
 * trapezoidal (Heun RK2) variant via `EngineConfig.integrator`.
 *
 * Bit-exact equivalence with the pre-P2 inlined loop is guaranteed: same
 * gravity constant, same evaluation order (`vx, vy` updated before `x, y`).
 */

const GRAVITY = 9.80665;

export interface IntegratorState {
  /** Horizontal position in m. */
  x: number;
  /** Vertical position in m (positive up). */
  y: number;
  /** Horizontal velocity in m/s. */
  vx: number;
  /** Vertical velocity in m/s. */
  vy: number;
}

export type DecelFn = (velocity: number) => number;

/**
 * Advance the state by one Euler step. `decelFn` returns the deceleration
 * magnitude along the velocity vector for the given speed (atmosphere &
 * Cd already baked in by the caller).
 */
export function eulerStep(s: IntegratorState, dt: number, decelFn: DecelFn): void {
  const v = Math.sqrt(s.vx * s.vx + s.vy * s.vy);
  if (v < 1) return;
  const decel = decelFn(v);
  const ax = -(decel * s.vx) / v;
  const ay = -GRAVITY - (decel * s.vy) / v;
  s.vx += ax * dt;
  s.vy += ay * dt;
  s.x += s.vx * dt;
  s.y += s.vy * dt;
}
