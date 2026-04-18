/**
 * Retardation (drag deceleration) — P1 + P2.
 *
 * Bit-exact copy of the legacy formulation: the same DRAG_K constant and the
 * same fixed sea-level speed of sound (343 m/s) so existing tests reproduce.
 *
 * P2 adds an optional `cdResolver` parameter that lets a profile inject its
 * own Cd source (e.g. MERO 169-pt table) without changing the default
 * behaviour. When omitted, the legacy piecewise + custom-table path is used.
 */

import type { DragModel, DragTablePoint } from '../../types';
import { cdFor, cdFromTable } from './standard-models';

/** Sea-level speed of sound used to derive Mach (legacy convention). */
const SOUND_MS = 343;

/**
 * Retardation coefficient: deceleration per unit distance.
 *
 * RECALIBRATION 2026-04: previous values (0.0042 / 0.0085 / 0.0050) were
 * roughly **40× too high** and caused the projectile to bleed almost all of
 * its velocity in 50 m, saturating the zero solver and producing absurd
 * drop figures (e.g. -647 mm at a 50 m zero). The current value has been
 * cross-checked against JBM/StrelokPro for an 18 gr .22 pellet, BC 0.025
 * G1, MV 280 m/s, zero 30 m → drop @ 50 m ≈ -95 mm, v @ 100 m ≈ 246 m/s.
 *
 * P3 plan: replace this empirical scalar with a dimensional formulation
 * (reference area + air density) once the MERO tables are validated end
 * to end.
 */
const DRAG_K = 0.0001;

/** Pluggable Cd source — model + Mach → Cd. */
export type CdResolver = (model: DragModel, mach: number) => number;

/**
 * Default resolver: legacy piecewise from `standard-models`.
 * Kept inline to avoid an extra import-time function dispatch in the hot
 * path of the legacy profile.
 */
function defaultResolver(model: DragModel, mach: number): number {
  return cdFor(model, mach);
}

/**
 * Retardation (deceleration along velocity direction) at a given speed.
 *
 * - Without `cdResolver`: identical to the P1 implementation.
 * - With `cdResolver`: the resolver replaces the piecewise lookup. The
 *   custom table override still wins when present so user-supplied tables
 *   keep their precedence.
 */
export function dragDecel(
  velocity: number,
  bc: number,
  atmoFactor: number,
  model: DragModel,
  customTable?: DragTablePoint[],
  cdResolver?: CdResolver,
): number {
  const mach = velocity / SOUND_MS;
  const cd = customTable && customTable.length > 0
    ? cdFromTable(customTable, mach)
    : (cdResolver ?? defaultResolver)(model, mach);
  return (cd * atmoFactor * velocity * velocity * DRAG_K) / bc;
}
