/**
 * Main trajectory solver — P1 + P2 + P3.
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
 * P3 additions:
 *   - Retardation mode: `chairgun-direct` uses ChairGun's (Cd/BC)×v formula
 *   - Vectorial wind: head + cross when `windModel === 'vectorial'`
 *   - Slope angle: Improved Rifleman's Rule (gravity cos(θ) correction)
 *   - Coriolis: lateral + vertical deflection from Earth rotation
 *   - BC zones: velocity-dependent BC interpolation
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
import { coriolisLateralMm } from './coriolis';
import { findZeroAngle } from './zero-solver';
import { getIntegrator, type IntegratorState } from './integrators';
import { cdFromMero, hasMeroTable } from './drag/mero-tables';
import type { EngineConfig } from './types';
import { buildEngineProvenance } from './provenance';
import type { EngineProvenance } from './provenance';

const GRAVITY = 9.80665; // m/s²
const GRAINS_TO_KG = 0.00006479891;

/**
 * Provenance snapshot of the most recent `calculateTrajectory` call.
 *
 * Stored at module scope (rather than threaded through the public
 * return type) so legacy call sites — they all read the trajectory
 * array directly — can opt into provenance without a breaking change.
 * UI consumers (e.g. `ResultsCard`) read it via `getLastEngineProvenance`.
 *
 * Single-threaded by design: the engine itself is synchronous, so there
 * is no race between two concurrent computations.
 */
let lastEngineProvenance: EngineProvenance | null = null;

/**
 * Returns the provenance object for the most recent trajectory
 * computation, or `null` if no trajectory has been computed yet
 * in this session.
 */
export function getLastEngineProvenance(): EngineProvenance | null {
  return lastEngineProvenance;
}

/**
 * Build the Cd resolver for a given config. When the atmosphere model is
 * `tetens-full` AND the retardation mode is NOT `chairgun-direct`, we swap
 * the Cd source to MERO tables — because the `mero` profile is the primary
 * consumer of `tetens-full` with standard retardation.
 *
 * ChairGun-direct mode bypasses this entirely (it uses its own Cd table
 * inside `dragDecel`).
 *
 * Returning `undefined` means "use the legacy default" (piecewise Cd from
 * `standard-models`), which keeps the legacy profile bit-exact.
 */
function buildCdResolver(config: EngineConfig | undefined): CdResolver | undefined {
  if (!config) return undefined;
  if (config.retardationMode === 'chairgun-direct') return undefined;
  if (config.atmosphereModel !== 'tetens-full') return undefined;
  return (model, mach) => (hasMeroTable(model) ? cdFromMero(model, mach) : 0);
}

/**
 * Resolve the effective BC at a given velocity, using bcZones if available.
 * Falls back to the base BC when no zones are provided.
 */
function resolveBC(baseBc: number, velocity: number, bcZones?: { bc: number; minVelocity: number }[] | null): number {
  if (!bcZones || bcZones.length === 0) return baseBc;

  // Sort by minVelocity descending to find the first zone the velocity falls into
  const sorted = [...bcZones].sort((a, b) => b.minVelocity - a.minVelocity);
  for (const zone of sorted) {
    if (velocity >= zone.minVelocity) return zone.bc;
  }
  // Below all zones — use the lowest zone's BC
  return sorted[sorted.length - 1].bc;
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
    slopeAngle,
    latitude,
    shootingAzimuth,
  } = input;

  const atmosphereModel = engineConfig?.atmosphereModel ?? 'icao-simple';
  const retardationMode = engineConfig?.retardationMode ?? 'standard';
  const windModel = engineConfig?.windModel ?? 'lateral-only';
  const doSlopeAngle = !!(engineConfig?.postProcess?.slopeAngle && slopeAngle);
  const doCoriolis = !!(engineConfig?.postProcess?.coriolis);

  // Two-pass zeroing weather: zero at zero conditions, fly through current conditions.
  const zeroAtmoFactor = calcAtmosphericFactor(zeroWeather ?? weather, atmosphereModel);
  const flightAtmoFactor = calcAtmosphericFactor(weather, atmosphereModel);

  const massKg = projectileWeight * GRAINS_TO_KG;
  const sightHeightM = sightHeight / 1000;

  const { cross: crosswind, head: headwind } = decomposeWind(weather);

  // Slope angle correction: effective gravity component perpendicular to bore
  const slopeRad = doSlopeAngle ? (slopeAngle! * Math.PI) / 180 : 0;
  const cosSlope = doSlopeAngle ? Math.cos(slopeRad) : 1;

  // SFP scaling — applied to the *displayed reticle* values only.
  const sfpScale =
    focalPlane === 'SFP' && magCalibration && currentMag && currentMag > 0
      ? magCalibration / currentMag
      : 1;

  const cdResolver = buildCdResolver(engineConfig);

  // Retrieve bcZones from the input if available (projectile-level, not engine-level)
  const bcZones = (input as { bcZones?: { bc: number; minVelocity: number }[] | null }).bcZones ?? null;

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

  // Single source of truth for which post-process steps + guards are
  // active. The flight loop reads this object instead of re-deriving the
  // user override on every step, and the same object is exposed via
  // `getLastEngineProvenance()` for the UI panel.
  const provenance = buildEngineProvenance(engineConfig);
  lastEngineProvenance = provenance;

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

  // Build the deceleration function with all P3 features wired in.
  const decelFn = (v: number) => {
    // BC zones: resolve velocity-dependent BC at each step
    const effectiveBc = resolveBC(bc, v, bcZones);
    return dragDecel(v, effectiveBc, flightAtmoFactor, dragModel, customDragTable, cdResolver, retardationMode);
  };

  while (state.x < maxRange + 1) {
    const v = Math.sqrt(state.vx * state.vx + state.vy * state.vy);
    if (v < 1) break;

    step(state, dt, decelFn);
    t += dt;

    // ── Wind drift ──────────────────────────────────────────────────
    // Didion lag-time model: drift = crosswind × (TOF_actual - Range/V₀).
    // The lag is the difference between the actual time of flight (with drag)
    // and the vacuum time of flight (without drag). This difference grows
    // as drag slows the projectile, causing it to spend more time exposed
    // to the crosswind.
    //
    // This matches ChairGun Elite and Strelok Pro's analytical wind model.
    // The previous constant (0.06) overestimated wind drift by ~5×.
    if (windModel === 'vectorial') {
      // Vectorial: same lag-time base plus headwind effect on effective V₀.
      // Headwind reduces effective V₀ → more lag → more drift.
      const effectiveV0 = muzzleVelocity - headwind;
      const vacuumTof = effectiveV0 > 1 ? state.x / effectiveV0 : t;
      windDriftX = crosswind * (t - vacuumTof);
    } else {
      // Legacy lateral-only: Didion lag-time formula.
      const vacuumTof = state.x / muzzleVelocity;
      windDriftX = crosswind * (t - vacuumTof);
    }

    if (state.x >= nextRange && nextRange <= maxRange) {
      // CRITICAL: this sight-line formula MUST match the one used inside
      // `simulateToRange` (the zero solver).
      // Straight line from (+sightHeight, 0) to (0, zeroRange).
      const sightLineAtRange = sightHeightM - (sightHeightM / zeroRange) * state.x;

      // Slope angle correction: Improved Rifleman's Rule.
      // The actual drop perpendicular to sight line is reduced by cos(θ).
      let dropMm = (state.y - sightLineAtRange) * 1000;
      if (doSlopeAngle) {
        dropMm *= cosSlope;
      }

      const holdoverMOA = state.x > 0 ? Math.atan2(-dropMm / 1000, state.x) * (180 / Math.PI) * 60 : 0;
      const holdoverMRAD = state.x > 0 ? (-dropMm / 1000 / state.x) * 1000 : 0;

      const currentV = Math.sqrt(state.vx * state.vx + state.vy * state.vy);
      const energyJ = 0.5 * massKg * currentV * currentV;

      // ── Spin drift ────────────────────────────────────────────────
      // Decision is centralised in `provenance.postProcess.spinDrift`
      // (built once above) — guarantees the value displayed in the UI
      // and the value actually used here cannot diverge.
      const spin = provenance.postProcess.spinDrift.enabled
        ? spinDriftMm(
            currentV,
            t,
            twistRate,
            projectileWeight,
            projectileDiameter,
            projectileLength,
          )
        : 0;

      // ── Coriolis drift ────────────────────────────────────────────
      const averageV = state.x > 0 ? state.x / t : muzzleVelocity;
      const coriolis = doCoriolis
        ? coriolisLateralMm(averageV, t, latitude, shootingAzimuth)
        : 0;

      const totalLatM = windDriftX + spin / 1000 + coriolis / 1000;
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

  return results;
}
