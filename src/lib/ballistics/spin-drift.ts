/**
 * Litz simplified spin-drift estimator — P1 extraction.
 *
 * Returns 0 when the projectile geometry or the twist rate is missing, so
 * the engine can call this unconditionally without branching at the call
 * site. Identical formulation to the legacy monolithic engine.
 */

const MM_TO_IN = 1 / 25.4;

/**
 * Estimate Litz spin drift in mm at a given time of flight.
 * SG = stability factor (Miller). Returns 0 when twist or geometry are missing.
 */
export function spinDriftMm(
  _velocity: number,
  tofSeconds: number,
  twistRate: number | undefined,
  weightGrains: number,
  diameterMm: number | undefined,
  lengthMm: number | undefined,
): number {
  if (!twistRate || !diameterMm || !lengthMm || tofSeconds <= 0) return 0;
  const dIn = diameterMm * MM_TO_IN;
  const lIn = lengthMm * MM_TO_IN;
  const lCal = lIn / dIn;
  if (lCal <= 0 || dIn <= 0) return 0;
  // Miller stability: SG = (30 * m) / (t² * d³ * l * (1 + l²)) with m in grains, d/l in cal
  const sg =
    (30 * weightGrains) /
    (twistRate * twistRate * Math.pow(dIn, 3) * lCal * (1 + lCal * lCal));
  if (sg <= 0) return 0;
  // Litz: drift (inches) ≈ 1.25 * (SG + 1.2) * tof^1.83
  const driftIn = 1.25 * (sg + 1.2) * Math.pow(tofSeconds, 1.83);
  return driftIn * 25.4; // mm
}
