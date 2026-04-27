/**
 * Zero-angle solver — P1 + P2 + P3.
 *
 * Bisection over launch angle. Bounds and step are identical to the legacy
 * engine when called without an `EngineConfig`, so the same root is found
 * bit-for-bit. P3 will swap this for a Newton-bissection hybrid with
 * stricter convergence guarantees.
 *
 * P2 addition: an optional `EngineConfig` argument lets the solver use the
 * same integrator + Cd resolver as the flight loop, ensuring zero ↔ flight
 * consistency for the MERO profile.
 *
 * P3 addition: retardation mode is passed through from the engine config
 * so the ChairGun profile's zero solver uses (Cd/BC)×v consistently.
 */

import type { DragModel, DragTablePoint } from '../types';
import { dragDecel, type CdResolver } from './drag/retardation';
import { getIntegrator, type IntegratorState } from './integrators';
import type { EngineConfig } from './types';

/**
 * Solve for the launch angle that makes the projectile cross the sight line
 * at `zeroRange`. Exported so calibration tooling can lock the **physical**
 * launch angle (rifle pointed exactly as it was when the user zeroed) and
 * vary BC without inadvertently re-zeroing the rifle for each candidate.
 */
export function findZeroAngle(
  muzzleVelocity: number,
  bc: number,
  sightHeightM: number,
  zeroRange: number,
  atmoFactor: number,
  model: DragModel,
  customTable: DragTablePoint[] | undefined,
  config?: EngineConfig,
  cdResolver?: CdResolver,
): number {
  // Wider bounds to accommodate slow projectiles, long zero ranges and high
  // air density. -3° (down) to +15° (up) covers every realistic PCP setup
  // including BB guns zeroed at 50 m and slugs zeroed at 100 m.
  let low = -0.05;
  let high = 0.26;
  // Default dt MUST stay 5e-4 when no config is passed — legacy bit-exact.
  const dt = config?.dt ?? 0.0005;
  const retardationMode = config?.retardationMode ?? 'standard';
  for (let i = 0; i < 80; i++) {
    const mid = (low + high) / 2;
    const y = simulateToRange(
      muzzleVelocity, bc, mid, sightHeightM, zeroRange,
      atmoFactor, dt, model, customTable, config, cdResolver, retardationMode,
    );
    if (Math.abs(y) < 0.00001) break;
    if (y > 0) high = mid;
    else low = mid;
  }
  return (low + high) / 2;
}

function simulateToRange(
  muzzleVelocity: number,
  bc: number,
  angle: number,
  sightHeightM: number,
  targetRange: number,
  atmoFactor: number,
  dt: number,
  model: DragModel,
  customTable: DragTablePoint[] | undefined,
  config: EngineConfig | undefined,
  cdResolver: CdResolver | undefined,
  retardationMode: string,
): number {
  const step = getIntegrator(config?.integrator ?? 'euler');
  const state: IntegratorState = {
    x: 0,
    y: 0,
    vx: muzzleVelocity * Math.cos(angle),
    vy: muzzleVelocity * Math.sin(angle),
  };
  const decelFn = (v: number) => dragDecel(v, bc, atmoFactor, model, customTable, cdResolver, retardationMode as any);
  while (state.x < targetRange) {
    const v = Math.sqrt(state.vx * state.vx + state.vy * state.vy);
    if (v < 1) break;
    step(state, dt, decelFn);
  }
  // Straight line from (+sightHeight, 0) to (0, zeroRange).
  const sightLineY = sightHeightM - (sightHeightM / targetRange) * state.x;
  return state.y - sightLineY;
}
