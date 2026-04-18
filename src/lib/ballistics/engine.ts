/**
 * Main trajectory solver — P1 extraction.
 *
 * Behaviour preserved bit-for-bit from the pre-P1 monolithic engine to
 * guarantee:
 *   - existing sessions reproduce exactly (no silent drift in saved results)
 *   - the existing test suite (`ballistics.test.ts`) keeps passing unchanged
 *
 * What changed in P1:
 *   - the function is composed from extracted modules (drag, atmosphere,
 *     wind, spin-drift, zero-solver) instead of being inlined
 *   - the `engineVersion` and `profileId` from the input are NOT consumed
 *     by the engine yet — they are surfaced upstream (Session) for P2's
 *     profile-aware dispatch
 *
 * Sight-line formula contract: the formula used here MUST match the one
 * inside `simulateToRange` (zero solver) — otherwise drop @ zeroRange
 * will not be 0 even though the solver converged. Both use a straight line
 * from (-sightHeight, 0) to (0, zeroRange).
 */

import type { BallisticInput, BallisticResult } from '../types';
import { calcAtmosphericFactor } from './atmosphere';
import { dragDecel } from './drag/retardation';
import { decomposeWind } from './wind';
import { spinDriftMm } from './spin-drift';
import { findZeroAngle } from './zero-solver';

const GRAVITY = 9.80665; // m/s²
const GRAINS_TO_KG = 0.00006479891;

export function calculateTrajectory(input: BallisticInput): BallisticResult[] {
  const {
    muzzleVelocity,
    bc,
    projectileWeight,
    sightHeight,
    zeroRange,
    maxRange,
    rangeStep,
    weather,
    clickValue,
    clickUnit,
    dragModel = 'G1',
    focalPlane = 'FFP',
    currentMag,
    magCalibration,
    twistRate,
    projectileLength,
    projectileDiameter,
    zeroWeather,
    customDragTable,
  } = input;

  // Two-pass zeroing weather: zero at zero conditions, fly through current conditions.
  const zeroAtmoFactor = calcAtmosphericFactor(zeroWeather ?? weather);
  const flightAtmoFactor = calcAtmosphericFactor(weather);

  const massKg = projectileWeight * GRAINS_TO_KG;
  const sightHeightM = sightHeight / 1000;

  const { cross: crosswind } = decomposeWind(weather);

  // SFP scaling — applied to the *displayed reticle* values only.
  const sfpScale =
    focalPlane === 'SFP' && magCalibration && currentMag && currentMag > 0
      ? magCalibration / currentMag
      : 1;

  const zeroAngle = findZeroAngle(
    muzzleVelocity,
    bc,
    sightHeightM,
    zeroRange,
    zeroAtmoFactor,
    dragModel,
    customDragTable,
  );

  const results: BallisticResult[] = [];
  const dt = 0.0005;

  let x = 0;
  let y = 0;
  let vx = muzzleVelocity * Math.cos(zeroAngle);
  let vy = muzzleVelocity * Math.sin(zeroAngle);
  let t = 0;
  let windDriftX = 0;

  let nextRange = rangeStep;

  // Muzzle row
  results.push({
    range: 0,
    drop: -sightHeightM * 1000,
    holdover: 0,
    holdoverMRAD: 0,
    reticleHoldoverMOA: 0,
    reticleHoldoverMRAD: 0,
    reticleWindMOA: 0,
    reticleWindMRAD: 0,
    velocity: muzzleVelocity,
    energy: 0.5 * massKg * muzzleVelocity * muzzleVelocity,
    tof: 0,
    windDrift: 0,
    windDriftMOA: 0,
    windDriftMRAD: 0,
    spinDrift: 0,
    clicksElevation: 0,
    clicksWindage: 0,
  });

  while (x < maxRange + 1) {
    const v = Math.sqrt(vx * vx + vy * vy);
    if (v < 1) break;

    const decel = dragDecel(v, bc, flightAtmoFactor, dragModel, customDragTable);
    const ax = -(decel * vx) / v;
    const ay = -GRAVITY - (decel * vy) / v;
    // Crosswind lag: the projectile is pushed sideways at a fraction of crosswind speed.
    const windAccel = crosswind * decel * 0.0008;

    vx += ax * dt;
    vy += ay * dt;
    x += vx * dt;
    y += vy * dt;
    t += dt;
    windDriftX += windAccel * dt * dt + crosswind * 0 /* explicit no-op for clarity */;
    // Simpler integration: drift speed grows linearly with time for a constant wind.
    windDriftX = crosswind * t * 0.06;

    if (x >= nextRange && nextRange <= maxRange) {
      // CRITICAL: this sight-line formula MUST match the one used inside
      // `simulateToRange` (the zero solver). See file-level docstring.
      const sightLineAtRange = -sightHeightM + (sightHeightM / zeroRange) * x;
      const dropMm = (y - sightLineAtRange) * 1000;

      const holdoverMOA = x > 0 ? Math.atan2(-dropMm / 1000, x) * (180 / Math.PI) * 60 : 0;
      const holdoverMRAD = x > 0 ? (-dropMm / 1000 / x) * 1000 : 0;

      const currentV = Math.sqrt(vx * vx + vy * vy);
      const energyJ = 0.5 * massKg * currentV * currentV;

      const spin = spinDriftMm(
        currentV,
        t,
        twistRate,
        projectileWeight,
        projectileDiameter,
        projectileLength,
      );

      const totalLatM = windDriftX + spin / 1000;
      const totalLatMm = totalLatM * 1000;
      const wdMOA = x > 0 ? Math.atan2(totalLatM, x) * (180 / Math.PI) * 60 : 0;
      const wdMRAD = x > 0 ? (totalLatM / x) * 1000 : 0;

      // Reticle (apparent) values — SFP scales them; FFP is identity.
      const reticleHoldMOA = holdoverMOA * sfpScale;
      const reticleHoldMRAD = holdoverMRAD * sfpScale;
      const reticleWindMOA = wdMOA * sfpScale;
      const reticleWindMRAD = wdMRAD * sfpScale;

      let clicksElev: number | undefined;
      let clicksWind: number | undefined;
      if (clickValue && clickUnit) {
        // Turret clicks always use TRUE angular values, never the SFP-scaled reticle.
        const holdRef = clickUnit === 'MOA' ? holdoverMOA : holdoverMRAD;
        const windRef = clickUnit === 'MOA' ? wdMOA : wdMRAD;
        clicksElev = Math.round(holdRef / clickValue);
        clicksWind = Math.round(windRef / clickValue);
      }

      results.push({
        range: nextRange,
        drop: Math.round(dropMm * 10) / 10,
        holdover: Math.round(holdoverMOA * 100) / 100,
        holdoverMRAD: Math.round(holdoverMRAD * 100) / 100,
        reticleHoldoverMOA: Math.round(reticleHoldMOA * 100) / 100,
        reticleHoldoverMRAD: Math.round(reticleHoldMRAD * 100) / 100,
        reticleWindMOA: Math.round(reticleWindMOA * 100) / 100,
        reticleWindMRAD: Math.round(reticleWindMRAD * 100) / 100,
        velocity: Math.round(currentV * 10) / 10,
        energy: Math.round(energyJ * 100) / 100,
        tof: Math.round(t * 1000) / 1000,
        windDrift: Math.round(totalLatMm * 10) / 10,
        windDriftMOA: Math.round(wdMOA * 100) / 100,
        windDriftMRAD: Math.round(wdMRAD * 100) / 100,
        spinDrift: Math.round(spin * 10) / 10,
        clicksElevation: clicksElev,
        clicksWindage: clicksWind,
      });

      nextRange += rangeStep;
    }
  }

  return results;
}
