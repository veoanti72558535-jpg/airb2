/**
 * Main trajectory solver — P1 + P2.
 *
 * Behaviour for legacy callers (no `engineConfig`) is preserved bit-for-bit
 * from the pre-P1 monolithic engine to guarantee:
 *   - existing sessions reproduce exactly (no silent drift in saved results)
 *   - the existing test suite (`ballistics.test.ts`) keeps passing unchanged
 *
 * P2 dispatch (when `input.engineConfig` is set):
 *   - integrator: Euler vs trapezoidal (RK2/Heun)
 *   - atmosphere: ICAO-simple vs Tetens-full (altitude lapse correction)
 *   - Cd source: legacy piecewise vs MERO 169-pt table
 *
 * Sight-line formula contract: the formula used here MUST match the one
 * inside `simulateToRange` (zero solver). Both use a straight line from
 * (-sightHeight, 0) to (0, zeroRange).
 */

import type { BallisticInput, BallisticResult } from '../types';
import { calcAtmosphericFactor } from './atmosphere';
import { dragDecel, type CdResolver } from './drag/retardation';
import { decomposeWind } from './wind';
import { spinDriftMm } from './spin-drift';
import { findZeroAngle } from './zero-solver';
import { getIntegrator, type IntegratorState } from './integrators';
import { cdFromMero, hasMeroTable } from './drag/mero-tables';
import type { EngineConfig } from './types';

const GRAVITY = 9.80665; // m/s²
const GRAINS_TO_KG = 0.00006479891;

/**
 * Build the Cd resolver for a given config. When the atmosphere model is
 * `tetens-full` we *also* swap the Cd source to MERO tables — because the
 * `mero` profile is the only consumer of `tetens-full`, and we want both
 * physics changes to land together.
 *
 * Returning `undefined` means "use the legacy default" (piecewise Cd from
 * `standard-models`), which keeps the legacy profile bit-exact.
 */
function buildCdResolver(config: EngineConfig | undefined): CdResolver | undefined {
  if (!config) return undefined;
  if (config.atmosphereModel !== 'tetens-full') return undefined;
  return (model, mach) => (hasMeroTable(model) ? cdFromMero(model, mach) : 0);
}

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
    engineConfig,
  } = input;

  const atmosphereModel = engineConfig?.atmosphereModel ?? 'icao-simple';
  // Two-pass zeroing weather: zero at zero conditions, fly through current conditions.
  const zeroAtmoFactor = calcAtmosphericFactor(zeroWeather ?? weather, atmosphereModel);
  const flightAtmoFactor = calcAtmosphericFactor(weather, atmosphereModel);

  const massKg = projectileWeight * GRAINS_TO_KG;
  const sightHeightM = sightHeight / 1000;

  const { cross: crosswind } = decomposeWind(weather);

  // SFP scaling — applied to the *displayed reticle* values only.
  const sfpScale =
    focalPlane === 'SFP' && magCalibration && currentMag && currentMag > 0
      ? magCalibration / currentMag
      : 1;

  const cdResolver = buildCdResolver(engineConfig);

  const zeroAngle = findZeroAngle(
    muzzleVelocity,
    bc,
    sightHeightM,
    zeroRange,
    zeroAtmoFactor,
    dragModel,
    customDragTable,
    engineConfig,
    cdResolver,
  );

  const results: BallisticResult[] = [];
  // Legacy bit-exact dt = 5e-4. MERO/trapezoidal can use a larger step.
  const dt = engineConfig?.dt ?? 0.0005;
  const step = getIntegrator(engineConfig?.integrator ?? 'euler');

  // State container for the integrator. Legacy code used loose locals; the
  // object form is allocation-free past the constructor and lets us share
  // the integrator dispatch with the zero solver.
  const state: IntegratorState = {
    x: 0,
    y: 0,
    vx: muzzleVelocity * Math.cos(zeroAngle),
    vy: muzzleVelocity * Math.sin(zeroAngle),
  };
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

  const decelFn = (v: number) => dragDecel(v, bc, flightAtmoFactor, dragModel, customDragTable, cdResolver);

  while (state.x < maxRange + 1) {
    const v = Math.sqrt(state.vx * state.vx + state.vy * state.vy);
    if (v < 1) break;

    step(state, dt, decelFn);
    t += dt;

    // Crosswind: simpler analytical drift = crosswind * t * 0.06. Identical
    // to the pre-P2 formulation (the windAccel intermediate variable in the
    // legacy code was a no-op).
    windDriftX = crosswind * t * 0.06;

    if (state.x >= nextRange && nextRange <= maxRange) {
      // CRITICAL: this sight-line formula MUST match the one used inside
      // `simulateToRange` (the zero solver).
      // Straight line from (+sightHeight, 0) to (0, zeroRange).
      const sightLineAtRange = sightHeightM - (sightHeightM / zeroRange) * state.x;
      const dropMm = (state.y - sightLineAtRange) * 1000;

      const holdoverMOA = state.x > 0 ? Math.atan2(-dropMm / 1000, state.x) * (180 / Math.PI) * 60 : 0;
      const holdoverMRAD = state.x > 0 ? (-dropMm / 1000 / state.x) * 1000 : 0;

      const currentV = Math.sqrt(state.vx * state.vx + state.vy * state.vy);
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
      const wdMOA = state.x > 0 ? Math.atan2(totalLatM, state.x) * (180 / Math.PI) * 60 : 0;
      const wdMRAD = state.x > 0 ? (totalLatM / state.x) * 1000 : 0;

      const reticleHoldMOA = holdoverMOA * sfpScale;
      const reticleHoldMRAD = holdoverMRAD * sfpScale;
      const reticleWindMOA = wdMOA * sfpScale;
      const reticleWindMRAD = wdMRAD * sfpScale;

      let clicksElev: number | undefined;
      let clicksWind: number | undefined;
      if (clickValue && clickUnit) {
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

  // ── Post-processing: slope & cant corrections ──────────────────────────
  const slopeRad = input.slopeAngleDeg ? input.slopeAngleDeg * (Math.PI / 180) : 0;
  const cantRad = input.cantAngleDeg ? input.cantAngleDeg * (Math.PI / 180) : 0;
  const applySlope = slopeRad !== 0;
  const applyCant = cantRad !== 0;

  if (applySlope || applyCant) {
    const cosSlopeSquared = applySlope ? Math.cos(slopeRad) * Math.cos(slopeRad) : 1;
    const sinCant = applyCant ? Math.sin(cantRad) : 0;
    const cosCantMinus1 = applyCant ? Math.cos(cantRad) - 1 : 0;

    for (const r of results) {
      if (r.range === 0) continue;

      if (applySlope) {
        r.dropAfterSlope = Math.round(r.drop * cosSlopeSquared * 10) / 10;
      }

      if (applyCant) {
        const effectiveDrop = applySlope ? r.dropAfterSlope! : r.drop;
        const shift = -effectiveDrop * sinCant;
        const dropCorr = effectiveDrop * cosCantMinus1;
        r.cantWindageShift = Math.round(shift * 10) / 10;
        r.cantDropCorrection = Math.round(dropCorr * 10) / 10;
        r.windDrift = Math.round((r.windDrift + shift) * 10) / 10;
      }
    }
  }

  return results;
}
