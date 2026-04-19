/**
 * Tranche P — Point Blank Range (PBR / MPBR) derivation (pure helper).
 *
 * Given a list of `BallisticResult` rows already produced by the engine and
 * a vital-zone diameter (in metres), determine the **continuous window of
 * distances** over which the projectile remains within ± (diameter / 2) of
 * the line of sight.
 *
 * STRICT POLICY:
 *  - Pure derivation — never re-runs or modifies the solver.
 *  - Reuses the engine's vertical convention (`drop` in mm, with 0 on the
 *    line of sight, positive above, negative below).
 *  - Linear interpolation against `range` for both the entry boundary
 *    (when the trajectory first crosses INSIDE the vital window) and the
 *    exit boundary (when it leaves the window for the last time before
 *    breaking the streak).
 *  - The "first useful PBR window" is taken: once the trajectory enters
 *    the vital window, the helper tracks its exit. Subsequent oscillations
 *    are ignored to keep behaviour predictable.
 *  - When the trajectory is still inside the window at the last sampled
 *    range, the end is honestly flagged as `limited-by-range`.
 *  - When the trajectory never enters the window, the result is null and
 *    the reason is reported.
 */

import type { BallisticResult } from './types';

export interface PointBlankRange {
  /** Vital-zone diameter that produced this PBR (metres). */
  vitalZoneM: number;
  /** Start of the PBR window in metres. `null` when no window observed. */
  startDistance: number | null;
  /** End of the PBR window in metres. `null` when no window observed. */
  endDistance: number | null;
  /** Length of the PBR window in metres (`end - start`). `null` if no window. */
  range: number | null;
  /** Distance (m) of the trajectory's apex above the LOS within the window. */
  maxOrdinateDistance: number | null;
  /** Apex height above LOS in **mm**, sampled within the window. */
  maxOrdinateMm: number | null;
  /**
   * `true` when the trajectory is still inside the vital window at the last
   * sampled range — the `endDistance` is therefore a lower bound, not an
   * actual exit distance.
   */
  limitedByComputedRange: boolean;
  /**
   * `null` when a window exists. Otherwise:
   *  - `'never-entered'` : trajectory never falls within the vital window
   *    over the sampled range.
   *  - `'insufficient'`  : fewer than 2 rows or invalid input.
   */
  missingReason: 'never-entered' | 'insufficient' | null;
}

const EMPTY = (vitalZoneM: number): PointBlankRange => ({
  vitalZoneM,
  startDistance: null,
  endDistance: null,
  range: null,
  maxOrdinateDistance: null,
  maxOrdinateMm: null,
  limitedByComputedRange: false,
  missingReason: 'insufficient',
});

/**
 * Linear interpolation: returns the range `x` between `a.range` and
 * `b.range` such that `drop(x) === target` (in mm). Assumes `a.drop` and
 * `b.drop` straddle `target`.
 */
function interpRange(
  a: BallisticResult,
  b: BallisticResult,
  target: number,
): number {
  const span = b.drop - a.drop;
  if (span === 0) return a.range;
  const t = (target - a.drop) / span;
  return a.range + t * (b.range - a.range);
}

/**
 * Compute the Point Blank Range for a given vital zone diameter.
 *
 * @param results        Engine-produced trajectory samples.
 * @param vitalZoneM     Vital-zone diameter in metres (must be > 0).
 */
export function computePointBlankRange(
  results: BallisticResult[] | null | undefined,
  vitalZoneM: number,
): PointBlankRange {
  if (!Number.isFinite(vitalZoneM) || vitalZoneM <= 0) {
    return EMPTY(vitalZoneM);
  }
  if (!results || results.length < 2) {
    return EMPTY(vitalZoneM);
  }

  // Convert vital-zone radius to mm to match `result.drop` units.
  const radiusMm = (vitalZoneM / 2) * 1000;
  const inWindow = (dropMm: number) => dropMm >= -radiusMm && dropMm <= radiusMm;

  let startDistance: number | null = null;
  let endDistance: number | null = null;
  let limitedByComputedRange = false;

  for (let i = 1; i < results.length; i++) {
    const prev = results[i - 1];
    const cur = results[i];
    const prevIn = inWindow(prev.drop);
    const curIn = inWindow(cur.drop);

    // Phase 1 — find the first entry into the window.
    if (startDistance == null) {
      if (prevIn && i === 1) {
        // The trajectory is already inside at the very first sample.
        startDistance = prev.range;
      } else if (!prevIn && curIn) {
        // Crossed INTO the window between prev and cur.
        // Pick the boundary the trajectory crossed (sign of prev.drop).
        const target = prev.drop < 0 ? -radiusMm : radiusMm;
        startDistance = interpRange(prev, cur, target);
      } else if (curIn && i === results.length - 1 && !prevIn) {
        // Defensive: handled by the branch above; nothing to do here.
      }
      // If we just entered, fall through to also test the exit on the
      // same step (degenerate but possible with a coarse grid).
    }

    if (startDistance != null) {
      // Phase 2 — track the exit from the window.
      if (curIn) {
        // Still inside; if this is the last sample, flag the limitation.
        if (i === results.length - 1) {
          endDistance = cur.range;
          limitedByComputedRange = true;
        }
        continue;
      }
      // curIn === false → trajectory has just exited the window.
      // Interpolate against the boundary it crossed.
      const target = cur.drop < 0 ? -radiusMm : radiusMm;
      endDistance = interpRange(prev, cur, target);
      break;
    }
  }

  if (startDistance == null) {
    return {
      vitalZoneM,
      startDistance: null,
      endDistance: null,
      range: null,
      maxOrdinateDistance: null,
      maxOrdinateMm: null,
      limitedByComputedRange: false,
      missingReason: 'never-entered',
    };
  }

  // `endDistance` may still be null if the loop ended without exiting nor
  // hitting the last-sample branch (defensive — shouldn't happen with
  // ≥ 2 rows once we've entered).
  if (endDistance == null) {
    const last = results[results.length - 1];
    endDistance = last.range;
    limitedByComputedRange = true;
  }

  // Scan apex within [startDistance, endDistance] using the existing
  // sampled drops. We prefer the maximum drop (most above LOS); if the
  // whole window stays at-or-below LOS, the apex is the least-negative drop.
  let apexDrop = -Infinity;
  let apexDistance: number | null = null;
  for (const r of results) {
    if (r.range < startDistance || r.range > endDistance) continue;
    if (r.drop > apexDrop) {
      apexDrop = r.drop;
      apexDistance = r.range;
    }
  }

  const range = endDistance - startDistance;

  return {
    vitalZoneM,
    startDistance,
    endDistance,
    range: range >= 0 ? range : 0,
    maxOrdinateDistance: apexDistance,
    maxOrdinateMm: apexDistance != null ? apexDrop : null,
    limitedByComputedRange,
    missingReason: null,
  };
}
