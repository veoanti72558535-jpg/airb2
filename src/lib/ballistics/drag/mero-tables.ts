/**
 * MERO-grade Cd tables — placeholder for P2.
 *
 * P1 ships the module skeleton so dependants can import without breaking,
 * but the high-resolution 169-point tables for G1/G7/GA/GS will land in P2
 * along with the `mero` profile. Until then, callers must continue to use
 * `cdFor` / `cdFromTable` from `./standard-models`.
 *
 * INTENTIONAL: keeping this empty in P1 prevents the legacy profile from
 * accidentally consuming half-imported tables. The presence of the file
 * documents the slot reserved for the upcoming work.
 */

import type { DragModel, DragTablePoint } from '../../types';

/**
 * Returns the MERO 169-point Cd table for a given drag model.
 * Throws in P1 — callers must check `hasMeroTable()` first.
 */
export function getMeroTable(_model: DragModel): DragTablePoint[] {
  throw new Error(
    '[ballistics] MERO Cd tables ship in P2. Use cdFor() from standard-models for P1.',
  );
}

/** P1 stub: always false. Flips to true once P2 lands the tables. */
export function hasMeroTable(_model: DragModel): boolean {
  return false;
}
