/**
 * Tranche O — Near Zero / Far Zero derivation (pure helper).
 *
 * Given a list of `BallisticResult` rows (already produced by the engine),
 * detect the first two crossings of the line of sight and expose them as
 * `nearZeroDistance` / `farZeroDistance` in metres.
 *
 * STRICT POLICY:
 *  - Pure derivation — never re-runs or modifies the solver.
 *  - Reuses the existing vertical reference (`drop` in mm, where 0 = on the
 *    line of sight, negative = below, positive = above; cf. engine.ts).
 *  - Linear interpolation between two adjacent samples when a crossing is
 *    bracketed by sign change.
 *  - A sample exactly at 0 counts as a crossing once — no double counting
 *    when the next sample also straddles zero from the other side.
 *  - If the first / second crossing does not exist in the sampled window,
 *    the corresponding distance is `null` and a flag tells the UI why.
 */

import type { BallisticResult } from './types';

export interface ZeroIntersections {
  /** First crossing of the line of sight (m). `null` if not observable. */
  nearZeroDistance: number | null;
  /** Second crossing of the line of sight (m). `null` if not observable. */
  farZeroDistance: number | null;
  /** True when `nearZeroDistance` came from an exact-zero sample (no interp). */
  nearExactSample: boolean;
  /** True when `farZeroDistance` came from an exact-zero sample (no interp). */
  farExactSample: boolean;
  /**
   * Reason near is missing (when null). `null` when present.
   * - `out-of-range` : trajectory never crosses LOS in the sampled window.
   * - `insufficient` : fewer than 2 rows provided, can't analyse.
   */
  nearMissingReason: 'out-of-range' | 'insufficient' | null;
  /**
   * Reason far is missing (when null). `null` when present.
   * - `out-of-range` : only one crossing observed (typical for very short setups).
   * - `insufficient` : fewer than 2 rows provided.
   */
  farMissingReason: 'out-of-range' | 'insufficient' | null;
}

const EMPTY: ZeroIntersections = {
  nearZeroDistance: null,
  farZeroDistance: null,
  nearExactSample: false,
  farExactSample: false,
  nearMissingReason: 'insufficient',
  farMissingReason: 'insufficient',
};

interface Crossing {
  range: number;
  exact: boolean;
}

/**
 * Detect the first two LOS crossings in a sampled trajectory.
 *
 * Convention (matches engine.ts): `result.drop` is in mm, with 0 on the
 * line of sight, positive above, negative below. We detect:
 *  - exact hits (`drop === 0`)
 *  - sign changes between consecutive samples → linear interpolation
 *
 * The very first sample (range 0) is typically below the LOS by `sightHeight`
 * and is **not** counted as a "crossing". An exact hit at range 0 would be
 * a degenerate setup; we still skip it to avoid producing a "zero" at the
 * muzzle which would mislead the user.
 */
export function computeZeroIntersections(
  results: BallisticResult[] | null | undefined,
): ZeroIntersections {
  if (!results || results.length < 2) return { ...EMPTY };

  const crossings: Crossing[] = [];

  // We track the previous sample's drop sign to detect sign changes.
  // `prevDrop` starts as the first sample. We never emit a crossing AT the
  // muzzle (range 0) — only along the trajectory.
  let prev = results[0];

  for (let i = 1; i < results.length; i++) {
    const cur = results[i];
    const prevDrop = prev.drop;
    const curDrop = cur.drop;

    // Case 1 — current sample is exactly on the LOS.
    // Count it as an exact crossing. We then advance `prev` to `cur` so the
    // next sample's sign-change check is relative to "0", which means a
    // sample on the same side as `prevDrop` will NOT trigger a duplicate.
    if (curDrop === 0 && cur.range > 0) {
      crossings.push({ range: cur.range, exact: true });
      if (crossings.length >= 2) break;
      prev = cur;
      continue;
    }

    // Case 2 — strict sign change between prev and cur (neither is zero).
    // Linear interpolation on `range` against `drop`.
    if (
      prevDrop !== 0 &&
      ((prevDrop < 0 && curDrop > 0) || (prevDrop > 0 && curDrop < 0))
    ) {
      const span = curDrop - prevDrop;
      // span is non-zero by construction (signs differ).
      const t = -prevDrop / span; // fraction in [0,1]
      const interp = prev.range + t * (cur.range - prev.range);
      crossings.push({ range: interp, exact: false });
      if (crossings.length >= 2) break;
    }

    prev = cur;
  }

  const near = crossings[0];
  const far = crossings[1];

  return {
    nearZeroDistance: near ? near.range : null,
    farZeroDistance: far ? far.range : null,
    nearExactSample: !!near && near.exact,
    farExactSample: !!far && far.exact,
    nearMissingReason: near ? null : 'out-of-range',
    farMissingReason: far ? null : near ? 'out-of-range' : 'out-of-range',
  };
}
