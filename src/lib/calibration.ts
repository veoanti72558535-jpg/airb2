/**
 * Empirical BC calibration.
 *
 * Use case: a shooter measured a real-world drop at distance D that does not
 * match what the engine predicts. We solve for a multiplicative factor k such
 * that running the engine with `bc * k` reproduces the measured drop.
 *
 * Method
 * ──────
 * Bisection on k ∈ [K_MIN, K_MAX]. For each candidate k we re-run the
 * deterministic engine (same atmosphere, same weapon, same projectile) with
 * the scaled BC, then linearly interpolate the result trajectory to D and
 * compare the predicted drop to the measured one.
 *
 * Bisection works here because drop-at-fixed-distance is a monotonic function
 * of BC: a higher BC ⇒ less drag ⇒ less drop (less negative). We pick k by
 * narrowing the interval until convergence (≤ TOL_MM) or until ITER_MAX.
 *
 * The function is pure & synchronous — no I/O, no side effects.
 *
 * What it is NOT
 * ──────────────
 * - Not a multi-distance least-squares fit (that's V2).
 * - Not an automatic projectile mutation: the caller decides whether to apply
 *   the corrected BC to a projectile (fresh derived snapshot) or just display.
 */

import { z } from 'zod';
import { calculateTrajectory } from './ballistics';
import { BallisticInput, Session } from './types';

// ── Tunables ────────────────────────────────────────────────────────────────

/** Minimum BC factor explored. Anything below ≈ 0.2× is non-physical. */
const K_MIN = 0.2;
/** Maximum BC factor explored. 5× covers the most extreme miscalibrations. */
const K_MAX = 5.0;
/** Convergence tolerance on the achieved drop, in millimetres. */
const TOL_MM = 0.5;
/** Bisection iteration cap — keeps the worst case bounded. */
const ITER_MAX = 30;
/** Beyond this multiplier, we still return a result but flag it as suspicious. */
const PLAUSIBLE_K_LOW = 0.5;
const PLAUSIBLE_K_HIGH = 2.0;

// ── Validation ──────────────────────────────────────────────────────────────

/**
 * Permissive but defensive bounds: distance must fit within sane airgun
 * envelopes, drop is allowed to be slightly positive (e.g. measured above
 * line of sight when overshooting at very short range) but capped to avoid
 * absurd inputs that would never converge.
 */
export const calibrationInputSchema = z.object({
  measuredDistance: z
    .number({ invalid_type_error: 'distance must be a number' })
    .finite()
    .gt(0, { message: 'distance must be > 0' })
    .max(1000, { message: 'distance must be ≤ 1000 m' }),
  measuredDropMm: z
    .number({ invalid_type_error: 'drop must be a number' })
    .finite()
    .min(-50000, { message: 'drop must be ≥ -50000 mm' })
    .max(5000, { message: 'drop must be ≤ 5000 mm' }),
});

export type CalibrationInput = z.infer<typeof calibrationInputSchema>;

export interface CalibrationResult {
  /** BC stored on the session input. */
  originalBc: number;
  /** BC × factor — what the engine should use to match the measurement. */
  correctedBc: number;
  /** Multiplicative correction. 1.0 means no change. */
  factor: number;
  /** Drop the engine originally predicted at the measured distance (mm). */
  predictedDropMm: number;
  /** Drop achieved by the engine with the corrected BC (mm). */
  achievedDropMm: number;
  /** Iterations used by the bisection. */
  iterations: number;
  /**
   * `extreme` — k landed outside the plausible window, the user should
   *   re-check chrono / zero / measurement before trusting the result.
   * `noConvergence` — the algorithm hit ITER_MAX without reaching TOL_MM
   *   (rare, typically when the drop is physically unreachable).
   */
  warning?: 'extreme' | 'noConvergence';
}

// ── Engine adapter ──────────────────────────────────────────────────────────

/**
 * Run the engine with a scaled BC and interpolate the drop at `distance`.
 *
 * Why interpolate: stored sessions are sampled at `rangeStep` (10 m typical),
 * so the measured distance rarely falls exactly on a grid point. Linear
 * interpolation between the two surrounding rows is plenty accurate for the
 * drop-vs-range curve at airgun distances.
 */
function dropAtDistance(input: BallisticInput, distance: number): number {
  // Tighten the grid around the measured distance: enough range to bracket it,
  // and a small step for accurate interpolation. We don't reuse the saved
  // step because a 50 m / 10 m grid is too coarse for a 23 m measurement.
  const tightInput: BallisticInput = {
    ...input,
    maxRange: Math.max(distance + 5, input.maxRange),
    rangeStep: 1,
  };
  const rows = calculateTrajectory(tightInput);
  if (rows.length === 0) return Number.NaN;

  // Find the bracketing rows.
  let lower = rows[0];
  let upper = rows[rows.length - 1];
  for (const r of rows) {
    if (r.range <= distance && r.range >= lower.range) lower = r;
    if (r.range >= distance && (upper.range < distance || r.range <= upper.range)) upper = r;
  }
  if (lower.range === upper.range) return lower.drop;
  const t = (distance - lower.range) / (upper.range - lower.range);
  return lower.drop + t * (upper.drop - lower.drop);
}

// ── Public API ──────────────────────────────────────────────────────────────

export interface CalibrateArgs extends CalibrationInput {
  session: Pick<Session, 'input'>;
}

/**
 * Solve for the BC multiplier that aligns the engine with the measurement.
 *
 * Throws when:
 *  - inputs fail the zod schema,
 *  - the session has no positive BC or muzzle velocity,
 *  - the engine cannot produce a trajectory (e.g. zero velocity).
 */
export function calibrateBC(args: CalibrateArgs): CalibrationResult {
  // Validate the user-provided numbers up front. We call .parse so callers
  // get a structured ZodError they can surface in the UI.
  const { measuredDistance, measuredDropMm } = calibrationInputSchema.parse({
    measuredDistance: args.measuredDistance,
    measuredDropMm: args.measuredDropMm,
  });

  const baseInput = args.session.input;
  if (!(baseInput.bc > 0)) {
    throw new Error('session BC must be > 0');
  }
  if (!(baseInput.muzzleVelocity > 0)) {
    throw new Error('session muzzle velocity must be > 0');
  }

  const originalBc = baseInput.bc;
  const predictedDropMm = dropAtDistance(baseInput, measuredDistance);
  if (!Number.isFinite(predictedDropMm)) {
    throw new Error('engine could not produce a baseline trajectory');
  }

  // Bisection. We rely on the monotonicity of drop(k):
  //   drop(K_MIN) is the most negative (high drag),
  //   drop(K_MAX) is the least negative (low drag).
  let kLow = K_MIN;
  let kHigh = K_MAX;
  let kMid = 1;
  let achievedDropMm = predictedDropMm;
  let iterations = 0;

  for (; iterations < ITER_MAX; iterations++) {
    kMid = (kLow + kHigh) / 2;
    const candidateInput: BallisticInput = { ...baseInput, bc: originalBc * kMid };
    achievedDropMm = dropAtDistance(candidateInput, measuredDistance);
    if (!Number.isFinite(achievedDropMm)) break;

    const diff = achievedDropMm - measuredDropMm;
    if (Math.abs(diff) <= TOL_MM) {
      iterations++;
      break;
    }
    // achieved less negative than measured ⇒ k too high (less drag) ⇒ lower it.
    if (diff > 0) kHigh = kMid;
    else kLow = kMid;
  }

  const factor = kMid;
  const correctedBc = originalBc * factor;

  let warning: CalibrationResult['warning'];
  if (Math.abs(achievedDropMm - measuredDropMm) > TOL_MM) {
    warning = 'noConvergence';
  } else if (factor < PLAUSIBLE_K_LOW || factor > PLAUSIBLE_K_HIGH) {
    warning = 'extreme';
  }

  return {
    originalBc,
    correctedBc,
    factor,
    predictedDropMm,
    achievedDropMm,
    iterations,
    warning,
  };
}
