/**
 * Standard drag models — P1 extraction (piecewise approximations).
 *
 * These piecewise Cd(Mach) curves are intentionally identical to the values
 * shipped by the pre-P1 monolithic engine so existing trajectories are
 * reproduced exactly. P2 will replace them with the MERO 169-point tables
 * for G1/G7/GA/GS, gated behind the `mero` profile.
 *
 * Each function is pure and takes Mach (≥0). Mach number is computed by the
 * caller against a fixed sea-level speed of sound (343 m/s) — see the
 * retardation module for the exact convention.
 */

import type { DragModel, DragTablePoint } from '../../types';

/**
 * G1 standard drag function (Ingalls). Returns Cd at a given Mach.
 * Tuned for the simplified subsonic-dominant regime of PCP airguns.
 */
function cdG1(mach: number): number {
  if (mach < 0.7) return 0.235;
  if (mach < 0.9) return 0.235 + (mach - 0.7) * 1.5;
  if (mach < 1.1) return 0.535 + (mach - 0.9) * 2.0;
  return Math.max(0.2, 0.935 - (mach - 1.1) * 0.3);
}

/**
 * G7 standard drag function (modern boat-tail). Lower subsonic Cd than G1
 * and a shallower transonic ramp — appropriate for slugs.
 * Approximation derived from published G7 tables (Bryan Litz, Applied Ballistics).
 */
function cdG7(mach: number): number {
  if (mach < 0.7) return 0.12;
  if (mach < 0.85) return 0.12 + (mach - 0.7) * 0.4; // ramp to ~0.18
  if (mach < 1.0) return 0.18 + (mach - 0.85) * 1.4; // ramp to ~0.39
  if (mach < 1.2) return 0.39 + (mach - 1.0) * 0.5; // peak ~0.49
  return Math.max(0.15, 0.49 - (mach - 1.2) * 0.25);
}

/**
 * GA — round-nose pellet (domed diabolo). Slightly higher subsonic Cd than G1
 * because the rounded head displaces more air than a pointed/flat nose.
 * Published BCs against GA are rare; treat as a slight derate of G1.
 */
function cdGA(mach: number): number {
  if (mach < 0.7) return 0.27;
  if (mach < 0.9) return 0.27 + (mach - 0.7) * 1.6; // ramp to ~0.59
  if (mach < 1.1) return 0.59 + (mach - 0.9) * 1.8; // peak ~0.95
  return Math.max(0.22, 0.95 - (mach - 1.1) * 0.3);
}

/**
 * GS — perfect sphere (BB / round shot). Cd ~0.47 in subsonic flow,
 * climbing sharply through the transonic region to ~0.92.
 * Reference: hydrodynamics tables for smooth spheres at Re > 1e5.
 */
function cdGS(mach: number): number {
  if (mach < 0.6) return 0.47;
  if (mach < 0.9) return 0.47 + (mach - 0.6) * 0.6; // ramp to ~0.65
  if (mach < 1.2) return 0.65 + (mach - 0.9) * 0.9; // peak ~0.92
  return Math.max(0.4, 0.92 - (mach - 1.2) * 0.2);
}

/**
 * Returns the Cd for the given Mach under one of the built-in standard drag
 * models. Exported so non-engine consumers (e.g. the drag-table preview UI)
 * can sample reference curves without duplicating the piecewise approximations.
 */
export function cdFor(model: DragModel, mach: number): number {
  switch (model) {
    case 'G7': return cdG7(mach);
    case 'GA': return cdGA(mach);
    case 'GS': return cdGS(mach);
    default: return cdG1(mach);
  }
}

/**
 * Linear interpolation of Cd against a custom Mach/Cd table.
 * Assumes the table is sorted ascending by Mach. Outside the table range,
 * the nearest endpoint value is returned (no extrapolation).
 */
export function cdFromTable(table: DragTablePoint[], mach: number): number {
  if (table.length === 0) return 0;
  if (mach <= table[0].mach) return table[0].cd;
  if (mach >= table[table.length - 1].mach) return table[table.length - 1].cd;
  for (let i = 0; i < table.length - 1; i++) {
    const a = table[i];
    const b = table[i + 1];
    if (mach >= a.mach && mach <= b.mach) {
      const span = b.mach - a.mach;
      if (span <= 0) return a.cd;
      const t = (mach - a.mach) / span;
      return a.cd + t * (b.cd - a.cd);
    }
  }
  return table[table.length - 1].cd;
}
