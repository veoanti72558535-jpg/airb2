/**
 * Zero-angle solver — P1 extraction.
 *
 * Bisection over launch angle. Bounds and step are identical to the legacy
 * engine so the same root is found bit-for-bit. P3 will swap this for a
 * Newton-bissection hybrid with stricter convergence guarantees.
 */

import type { DragModel, DragTablePoint } from '../types';
import { dragDecel } from './drag/retardation';

const GRAVITY = 9.80665; // m/s²

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
): number {
  // Wider bounds to accommodate slow projectiles, long zero ranges and high
  // air density. -3° (down) to +15° (up) covers every realistic PCP setup
  // including BB guns zeroed at 50 m and slugs zeroed at 100 m.
  let low = -0.05;
  let high = 0.26;
  const dt = 0.0005;
  for (let i = 0; i < 80; i++) {
    const mid = (low + high) / 2;
    const y = simulateToRange(muzzleVelocity, bc, mid, sightHeightM, zeroRange, atmoFactor, dt, model, customTable);
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
): number {
  let x = 0;
  let y = 0;
  let vx = muzzleVelocity * Math.cos(angle);
  let vy = muzzleVelocity * Math.sin(angle);
  while (x < targetRange) {
    const v = Math.sqrt(vx * vx + vy * vy);
    if (v < 1) break;
    const decel = dragDecel(v, bc, atmoFactor, model, customTable);
    const ax = -(decel * vx) / v;
    const ay = -GRAVITY - (decel * vy) / v;
    vx += ax * dt;
    vy += ay * dt;
    x += vx * dt;
    y += vy * dt;
  }
  const sightLineY = -sightHeightM + (sightHeightM / targetRange) * x;
  return y - sightLineY;
}
