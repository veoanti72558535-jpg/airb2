/**
 * Retardation (drag deceleration) — P1 + P2 + P3 (ChairGun-direct).
 *
 * Bit-exact copy of the legacy formulation: the same DRAG_K constant and the
 * same fixed sea-level speed of sound (343 m/s) so existing tests reproduce.
 *
 * P2 adds an optional `cdResolver` parameter that lets a profile inject its
 * own Cd source (e.g. MERO 169-pt table) without changing the default
 * behaviour. When omitted, the legacy piecewise + custom-table path is used.
 *
 * P3 adds a `chairgun-direct` retardation mode that uses ChairGun Elite's
 * native formula: `(Cd / BC) × v`. This formula does NOT use DRAG_K or
 * atmosphere correction — the BC in ChairGun is an empirical "real-world"
 * value that already accounts for operating conditions. This path is gated
 * behind `RetardationMode = 'chairgun-direct'` to avoid altering any
 * existing profile.
 */

import type { DragModel, DragTablePoint } from '../../types';
import { cdFor, cdFromTable } from './standard-models';
import { chairgunRetardation } from './chairgun-drag-table';

/** Sea-level speed of sound used to derive Mach (legacy convention). */
const SOUND_MS = 343;

/**
 * Retardation coefficient: deceleration per unit distance.
 *
 * DRAG_K = 0.00036 — calibrated against JSB KnockOut 25.39gr BC G1=0.084,
 * MV 280 m/s, zero 50 m, sightHeight 47 mm, altitude 770 m.
 * Cross-validated on 3 independent scenarios against ChairGun Elite,
 * Strelok Pro, and MERO. Correction ratio: 3.6× vs previous 0.0001.
 */
const DRAG_K = 0.00036;

/** Pluggable Cd source — model + Mach → Cd. */
export type CdResolver = (model: DragModel, mach: number) => number;

/**
 * Retardation mode selector.
 *
 * - `'standard'` (default): legacy `(Cd × atmo × v² × DRAG_K) / BC`.
 * - `'chairgun-direct'`: ChairGun Elite `(Cd / BC) × v` — no DRAG_K, no
 *   atmosphere factor. Uses the ChairGun 14-point subsonic Cd table and
 *   CHAIRGUN_SOUND_MS (340.3 m/s).
 */
export type RetardationMode = 'standard' | 'chairgun-direct';

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
 * - With `retardationMode = 'chairgun-direct'`: bypasses the standard
 *   formula entirely and delegates to `chairgunRetardation()`.
 */
export function dragDecel(
  velocity: number,
  bc: number,
  atmoFactor: number,
  model: DragModel,
  customTable?: DragTablePoint[],
  cdResolver?: CdResolver,
  retardationMode?: RetardationMode,
): number {
  // ChairGun-direct: entirely different physics formula.
  if (retardationMode === 'chairgun-direct') {
    // Custom table still wins even in chairgun mode (user-supplied data).
    if (customTable && customTable.length > 0) {
      const mach = velocity / SOUND_MS;
      const cd = cdFromTable(customTable, mach);
      return (cd / bc) * velocity;
    }
    return chairgunRetardation(velocity, bc);
  }

  // Standard: legacy P1/P2 formula.
  const mach = velocity / SOUND_MS;
  const cd = customTable && customTable.length > 0
    ? cdFromTable(customTable, mach)
    : (cdResolver ?? defaultResolver)(model, mach);
  return (cd * atmoFactor * velocity * velocity * DRAG_K) / bc;
}
