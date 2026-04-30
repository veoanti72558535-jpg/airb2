/**
 * Litz simplified spin-drift estimator — P1 extraction.
 *
 * Returns 0 when the projectile geometry or the twist rate is missing, so
 * the engine can call this unconditionally without branching at the call
 * site. Identical formulation to the legacy monolithic engine.
 *
 * 2026-04 fix: the raw Litz formula `1.25 * (SG + 1.2) * tof^1.83` is
 * calibrated for supersonic centerfire projectiles (typical SG 1.5 – 2.0).
 * For sub-sonic PCP airgun pellets/slugs, the Miller stability factor is
 * extremely high (SG often 8 – 15) and the raw formula overestimates spin
 * drift by 5 – 10×, producing tens to hundreds of mm of phantom lateral
 * drift even with zero wind. Two guards are added:
 *   - the SG term is clamped at `SG_MAX_EFFECTIVE = 2.5` (well above the
 *     supersonic calibration range, so super/sonic results are unchanged),
 *   - velocities below `MIN_SPIN_DRIFT_VELOCITY = 200 m/s` return 0 since
 *     gyroscopic drift is physically negligible at PCP airgun speeds.
 */

const MM_TO_IN = 1 / 25.4;

/**
 * Hard cap on the SG term used inside the Litz formula (see file header).
 * Exported so the provenance object surfaced in the UI stays in sync with
 * the actual numerical guard — never duplicate this value elsewhere.
 */
export const SG_MAX_EFFECTIVE = 2.5;

/**
 * Velocity (m/s) below which spin drift is forced to 0 (PCP regime).
 * Exported for the same reason as `SG_MAX_EFFECTIVE` — provenance traceability.
 */
export const MIN_SPIN_DRIFT_VELOCITY = 200;

/**
 * Estimate Litz spin drift in mm at a given time of flight.
 * SG = stability factor (Miller). Returns 0 when twist or geometry are missing.
 */
export function spinDriftMm(
  velocity: number,
  tofSeconds: number,
  twistRate: number | undefined,
  weightGrains: number,
  diameterMm: number | undefined,
  lengthMm: number | undefined,
): number {
  if (!twistRate || !diameterMm || !lengthMm || tofSeconds <= 0) return 0;
  // PCP regime: at sub-200 m/s the Litz model is well outside its
  // calibration window; return 0 to avoid phantom drift.
  if (velocity > 0 && velocity < MIN_SPIN_DRIFT_VELOCITY) return 0;
  const dIn = diameterMm * MM_TO_IN;
  const lIn = lengthMm * MM_TO_IN;
  const lCal = lIn / dIn;
  if (lCal <= 0 || dIn <= 0) return 0;
  // Miller stability: SG = (30 * m) / (t² * d³ * l * (1 + l²)) with m in grains, d/l in cal
  const sg =
    (30 * weightGrains) /
    (twistRate * twistRate * Math.pow(dIn, 3) * lCal * (1 + lCal * lCal));
  if (sg <= 0) return 0;
  // Cap the SG term: the Litz formula was calibrated for SG 1.5 – 2.0.
  // PCP slugs commonly hit SG 8 – 15 with their tight twists (1:16" /
  // 1:12") and short heavy projectiles, which the raw formula amplifies
  // linearly into unrealistic drift values.
  const sgEff = Math.min(sg, SG_MAX_EFFECTIVE);
  // Litz: drift (inches) ≈ 1.25 * (SG + 1.2) * tof^1.83
  const driftIn = 1.25 * (sgEff + 1.2) * Math.pow(tofSeconds, 1.83);
  return driftIn * 25.4; // mm
}
