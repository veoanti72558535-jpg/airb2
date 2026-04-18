/**
 * Retardation (drag deceleration) — P1 extraction.
 *
 * Bit-exact copy of the legacy formulation: the same DRAG_K constant and the
 * same fixed sea-level speed of sound (343 m/s) so existing tests reproduce.
 *
 * The DRAG_K rationale (recalibration history) lives at the constant
 * declaration below — moved verbatim from the pre-P1 ballistics.ts to keep
 * the institutional knowledge alongside the value.
 */

import type { DragModel, DragTablePoint } from '../../types';
import { cdFor, cdFromTable } from './standard-models';

/** Sea-level speed of sound used to derive Mach (legacy convention). */
const SOUND_MS = 343;

/**
 * Retardation coefficient: deceleration per unit distance.
 *
 * The `k` factor is an empirical scaling that makes a given Ballistic
 * Coefficient (BC) produce trajectories consistent with published
 * subsonic-airgun data across drag families.
 *
 * RECALIBRATION 2026-04: previous values (0.0042 / 0.0085 / 0.0050) were
 * roughly **40× too high** and caused the projectile to bleed almost all of
 * its velocity in 50 m, saturating the zero solver and producing absurd
 * drop figures (e.g. -647 mm at a 50 m zero). The values below have been
 * cross-checked against JBM/StrelokPro for an 18 gr .22 pellet, BC 0.025
 * G1, MV 280 m/s, zero 30 m → drop @ 50 m ≈ -95 mm, v @ 100 m ≈ 246 m/s.
 *
 * The same base k applies to every model because the drag *family* is
 * already encoded in the Cd curve. Custom drag tables share the G1
 * reference scaling — the table itself encodes the projectile's true drag
 * profile; `k` only normalises how BC is interpreted against that table.
 *
 * P2 plan: replace this empirical scalar with a dimensional formulation
 * (reference area + air density) once the MERO tables ship.
 */
const DRAG_K = 0.0001;

/**
 * Retardation (deceleration along velocity direction) at a given speed.
 * The caller is responsible for the atmospheric factor (use
 * `calcAtmosphericFactor`).
 */
export function dragDecel(
  velocity: number,
  bc: number,
  atmoFactor: number,
  model: DragModel,
  customTable?: DragTablePoint[],
): number {
  const mach = velocity / SOUND_MS;
  const cd = customTable && customTable.length > 0
    ? cdFromTable(customTable, mach)
    : cdFor(model, mach);
  return (cd * atmoFactor * velocity * velocity * DRAG_K) / bc;
}
