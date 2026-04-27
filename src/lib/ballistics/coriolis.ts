/**
 * Coriolis drift estimator — P3.
 *
 * Computes the lateral and vertical components of Coriolis deflection
 * for a projectile in flight. This is a feature Strelok Pro includes
 * but ChairGun does not — it becomes meaningful for airgun slugs at
 * ranges beyond 80 m and for .22 LR beyond 100 m.
 *
 * The estimation uses the simplified Coriolis formulas from Bryan Litz
 * (Applied Ballistics for Long-Range Shooting):
 *
 *   Vertical deflection (m) = Ω × v × sin(azimuth) × cos(latitude) × t²
 *   Horizontal deflection (m) = Ω × v × sin(latitude) × t²
 *
 * where:
 *   Ω = Earth's angular velocity = 7.2921e-5 rad/s
 *   v = average velocity over flight time
 *   t = time of flight in seconds
 *   latitude = shooter latitude in radians
 *   azimuth = shooting direction (0 = north, π/2 = east, etc.)
 *
 * Returns 0 when any required parameter is missing, so the engine can
 * call this unconditionally without branching.
 */

const OMEGA = 7.2921e-5; // Earth angular velocity (rad/s)

/**
 * Lateral Coriolis drift in mm.
 *
 * Positive = deflection to the right (Northern hemisphere, any azimuth).
 * In the Southern hemisphere the sign flips naturally via sin(latitude).
 */
export function coriolisLateralMm(
  averageVelocity: number,
  tofSeconds: number,
  latitudeDeg: number | undefined,
  _azimuthDeg: number | undefined,
): number {
  if (latitudeDeg == null || tofSeconds <= 0 || averageVelocity <= 0) return 0;

  const latRad = (latitudeDeg * Math.PI) / 180;

  // Horizontal Coriolis: Ω × v_avg × sin(lat) × t²
  // This is the dominant component for most shooting scenarios.
  const driftM = OMEGA * averageVelocity * Math.sin(latRad) * tofSeconds * tofSeconds;
  return driftM * 1000; // mm
}

/**
 * Vertical Coriolis drift in mm.
 *
 * Much smaller than lateral for most scenarios. Only relevant for very
 * long shots (> 200 m) in east/west directions at low latitudes.
 */
export function coriolisVerticalMm(
  averageVelocity: number,
  tofSeconds: number,
  latitudeDeg: number | undefined,
  azimuthDeg: number | undefined,
): number {
  if (latitudeDeg == null || azimuthDeg == null || tofSeconds <= 0 || averageVelocity <= 0) return 0;

  const latRad = (latitudeDeg * Math.PI) / 180;
  const azRad = (azimuthDeg * Math.PI) / 180;

  // Vertical Coriolis: Ω × v_avg × sin(az) × cos(lat) × t²
  const driftM = OMEGA * averageVelocity * Math.sin(azRad) * Math.cos(latRad) * tofSeconds * tofSeconds;
  return driftM * 1000; // mm
}
