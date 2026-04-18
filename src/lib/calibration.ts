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
import {
  calcAtmosphericFactor,
  dragDecel,
  findZeroAngle,
} from './ballistics';
import { BallisticInput, Session } from './types';

// ── Tunables ────────────────────────────────────────────────────────────────

/** Minimum BC factor explored. Anything below ≈ 0.2× is non-physical. */
const K_MIN = 0.2;
/** Maximum BC factor explored. 5× covers the most extreme miscalibrations. */
const K_MAX = 5.0;
/** Convergence tolerance on the achieved drop, in millimetres. */
const TOL_MM = 0.5;
/** Bisection iteration cap — keeps the worst case bounded. */
const ITER_MAX = 40;
/** Beyond this multiplier, we still return a result but flag it as suspicious. */
const PLAUSIBLE_K_LOW = 0.5;
const PLAUSIBLE_K_HIGH = 2.0;

// Physics — must stay in sync with src/lib/ballistics.ts.
const GRAVITY = 9.80665;
const DT = 0.0005;

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
 * Drop (mm, relative to the original sight line) at `distance`, using a
 * **fixed launch angle** equal to the rifle's physical zero with the
 * original BC. We cannot reuse `calculateTrajectory` here because that
 * function re-zeros the rifle for every candidate BC — which would mask
 * the very effect we are trying to measure (BC's influence on drop at the
 * test distance). By locking the launch angle, varying BC moves the
 * trajectory in a strictly monotonic way, giving the bisection real
 * traction.
 */
function dropAtDistance(
  input: BallisticInput,
  bcOverride: number,
  zeroAngle: number,
  distance: number,
): number {
  const flightAtmo = calcAtmosphericFactor(input.weather);
  const sightHeightM = input.sightHeight / 1000;
  const zeroRange = input.zeroRange;
  const dragModel = input.dragModel ?? 'G1';

  let x = 0;
  let y = 0;
  let vx = input.muzzleVelocity * Math.cos(zeroAngle);
  let vy = input.muzzleVelocity * Math.sin(zeroAngle);

  // Step until we cross the target distance, then linearly interpolate.
  let prevX = x;
  let prevY = y;
  while (x < distance) {
    const v = Math.sqrt(vx * vx + vy * vy);
    if (v < 1) return Number.NaN;
    const decel = dragDecel(v, bcOverride, flightAtmo, dragModel, input.customDragTable);
    const ax = -(decel * vx) / v;
    const ay = -GRAVITY - (decel * vy) / v;
    prevX = x;
    prevY = y;
    vx += ax * DT;
    vy += ay * DT;
    x += vx * DT;
    y += vy * DT;
    if (x > distance + 50) return Number.NaN; // safety
  }

  const span = x - prevX;
  const t = span > 0 ? (distance - prevX) / span : 0;
  const yAtD = prevY + t * (y - prevY);
  const sightLine = -sightHeightM + (sightHeightM / zeroRange) * distance;
  return (yAtD - sightLine) * 1000;
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
  const sightHeightM = baseInput.sightHeight / 1000;
  const dragModel = baseInput.dragModel ?? 'G1';

  // Lock the launch angle to the rifle's actual zero with the original BC.
  // We then sweep BC while keeping the angle fixed — that's what physically
  // happens in the field: the user does not re-zero between shots, they just
  // observe the resulting drop. Use the *zero atmosphere* (matches the engine).
  const zeroAtmo = calcAtmosphericFactor(baseInput.zeroWeather ?? baseInput.weather);
  const zeroAngle = findZeroAngle(
    baseInput.muzzleVelocity,
    originalBc,
    sightHeightM,
    baseInput.zeroRange,
    zeroAtmo,
    dragModel,
    baseInput.customDragTable,
  );

  const predictedDropMm = dropAtDistance(baseInput, originalBc, zeroAngle, measuredDistance);
  if (!Number.isFinite(predictedDropMm)) {
    throw new Error('engine could not produce a baseline trajectory');
  }

  // Bisection on k. With the launch angle locked, drop is strictly monotonic
  // in BC: higher BC ⇒ less drag ⇒ less negative drop.
  let kLow = K_MIN;
  let kHigh = K_MAX;
  let kMid = 1;
  let achievedDropMm = predictedDropMm;
  let iterations = 0;

  for (; iterations < ITER_MAX; iterations++) {
    kMid = (kLow + kHigh) / 2;
    achievedDropMm = dropAtDistance(baseInput, originalBc * kMid, zeroAngle, measuredDistance);
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
