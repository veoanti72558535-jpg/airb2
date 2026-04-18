/**
 * Deterministic ballistic engine for PCP airguns.
 * Supports G1 and G7 drag models, zeroing-weather double pass,
 * SFP reticle adjustment and Litz spin-drift estimation.
 * NO AI involved — pure physics calculations.
 */

import {
  BallisticInput,
  BallisticResult,
  DragModel,
  DragTablePoint,
  WeatherSnapshot,
} from './types';

// ── Constants ──
const GRAVITY = 9.80665; // m/s²
const STANDARD_TEMP = 15; // °C (ICAO standard)
const STANDARD_PRESSURE = 1013.25; // hPa
const STANDARD_HUMIDITY = 0; // %
const STANDARD_ALTITUDE = 0; // m
const GRAINS_TO_KG = 0.00006479891;
const MM_TO_IN = 1 / 25.4;

// ── Atmosphere ──

function calcAirDensity(weather: WeatherSnapshot): number {
  const tempK = weather.temperature + 273.15;
  const es =
    6.1078 * Math.pow(10, (7.5 * weather.temperature) / (237.3 + weather.temperature));
  const pv = (weather.humidity / 100) * es;
  const pd = weather.pressure - pv;
  const Rd = 287.058;
  const Rv = 461.495;
  return (pd * 100) / (Rd * tempK) + (pv * 100) / (Rv * tempK);
}

/**
 * Atmospheric density correction factor (current ÷ ICAO-standard).
 * Exported so calibration / tooling can reuse the exact same atmosphere
 * the engine uses, without re-implementing the formula.
 */
export function calcAtmosphericFactor(weather: WeatherSnapshot): number {
  const rhoActual = calcAirDensity(weather);
  const rhoStd = calcAirDensity({
    temperature: STANDARD_TEMP,
    humidity: STANDARD_HUMIDITY,
    pressure: STANDARD_PRESSURE,
    altitude: STANDARD_ALTITUDE,
    windSpeed: 0,
    windAngle: 0,
    source: 'manual',
    timestamp: '',
  });
  return rhoActual / rhoStd;
}

// ── Drag models ──

/**
 * G1 standard drag function (Ingalls). Returns Cd at a given Mach.
 * Tuned for the simplified subsonic-dominant regime of PCP airguns.
 */
function cdG1(mach: number): number {
  if (mach < 0.7) return 0.235;
  if (mach < 0.9) return 0.235 + (mach - 0.7) * 1.5;
  if (mach < 1.1) return 0.535 + (mach - 0.9) * 2.0;
  return Math.max(0.2, 0.935 - (mach - 1.1) * 0.3);
}

/**
 * G7 standard drag function (modern boat-tail). Lower subsonic Cd than G1
 * and a shallower transonic ramp — appropriate for slugs.
 * Approximation derived from published G7 tables (Bryan Litz, Applied Ballistics).
 */
function cdG7(mach: number): number {
  if (mach < 0.7) return 0.12;
  if (mach < 0.85) return 0.12 + (mach - 0.7) * 0.4; // ramp to ~0.18
  if (mach < 1.0) return 0.18 + (mach - 0.85) * 1.4; // ramp to ~0.39
  if (mach < 1.2) return 0.39 + (mach - 1.0) * 0.5; // peak ~0.49
  return Math.max(0.15, 0.49 - (mach - 1.2) * 0.25);
}

/**
 * GA — round-nose pellet (domed diabolo). Slightly higher subsonic Cd than G1
 * because the rounded head displaces more air than a pointed/flat nose.
 * Published BCs against GA are rare; treat as a slight derate of G1.
 */
function cdGA(mach: number): number {
  if (mach < 0.7) return 0.27;
  if (mach < 0.9) return 0.27 + (mach - 0.7) * 1.6; // ramp to ~0.59
  if (mach < 1.1) return 0.59 + (mach - 0.9) * 1.8; // peak ~0.95
  return Math.max(0.22, 0.95 - (mach - 1.1) * 0.3);
}

/**
 * GS — perfect sphere (BB / round shot). Cd ~0.47 in subsonic flow,
 * climbing sharply through the transonic region to ~0.92.
 * Reference: hydrodynamics tables for smooth spheres at Re > 1e5.
 */
function cdGS(mach: number): number {
  if (mach < 0.6) return 0.47;
  if (mach < 0.9) return 0.47 + (mach - 0.6) * 0.6; // ramp to ~0.65
  if (mach < 1.2) return 0.65 + (mach - 0.9) * 0.9; // peak ~0.92
  return Math.max(0.4, 0.92 - (mach - 1.2) * 0.2);
}

/**
 * Returns the Cd for the given Mach under one of the built-in standard drag
 * models. Exported so non-engine consumers (e.g. the drag-table preview UI)
 * can sample reference curves without duplicating the piecewise approximations.
 */
export function cdFor(model: DragModel, mach: number): number {
  switch (model) {
    case 'G7': return cdG7(mach);
    case 'GA': return cdGA(mach);
    case 'GS': return cdGS(mach);
    default: return cdG1(mach);
  }
}

/**
 * Linear interpolation of Cd against a custom Mach/Cd table.
 * Assumes the table is sorted ascending by Mach. Outside the table range,
 * the nearest endpoint value is returned (no extrapolation).
 *
 * Exported for unit tests and any future tooling (e.g. Cd preview tooltip).
 */
export function cdFromTable(table: DragTablePoint[], mach: number): number {
  if (table.length === 0) return 0;
  if (mach <= table[0].mach) return table[0].cd;
  if (mach >= table[table.length - 1].mach) return table[table.length - 1].cd;
  for (let i = 0; i < table.length - 1; i++) {
    const a = table[i];
    const b = table[i + 1];
    if (mach >= a.mach && mach <= b.mach) {
      const span = b.mach - a.mach;
      if (span <= 0) return a.cd;
      const t = (mach - a.mach) / span;
      return a.cd + t * (b.cd - a.cd);
    }
  }
  return table[table.length - 1].cd;
}

/**
 * Retardation coefficient: deceleration per unit distance.
 *
 * The `k` factor is an empirical scaling that makes a given Ballistic
 * Coefficient (BC) produce trajectories consistent with published
 * subsonic-airgun data across drag families.
 *
 * RECALIBRATION 2026-04: previous values (0.0042 / 0.0085 / 0.0050) were
 * roughly **40× too high** and caused the projectile to bleed almost all of
 * its velocity in 50 m, saturating the zero solver and producing absurd
 * drop figures (e.g. -647 mm at a 50 m zero). The values below have been
 * cross-checked against JBM/StrelokPro for an 18 gr .22 pellet, BC 0.025
 * G1, MV 280 m/s, zero 30 m → drop @ 50 m ≈ -95 mm, v @ 100 m ≈ 246 m/s.
 *
 * The same base k applies to every model because the drag *family* is
 * already encoded in the Cd curve (`cdG1` / `cdG7` / `cdGA` / `cdGS`).
 * Custom drag tables share the G1 reference scaling — the table itself
 * encodes the projectile's true drag profile; `k` only normalises how BC
 * is interpreted against that table.
 *
 * These constants are intentionally empirical: a fully physical model would
 * carry the projectile's reference area and a dimensional constant, but
 * airgun pellets do not always publish their cross-section, so we keep the
 * BC-centric formulation that matches user expectations from JBM/StrelokPro.
 */
const DRAG_K = 0.0001;

function dragDecel(
  velocity: number,
  bc: number,
  atmoFactor: number,
  model: DragModel,
  customTable?: DragTablePoint[],
): number {
  const mach = velocity / 343;
  const cd = customTable && customTable.length > 0
    ? cdFromTable(customTable, mach)
    : cdFor(model, mach);
  return (cd * atmoFactor * velocity * velocity * DRAG_K) / bc;
}

// ── Spin drift (Litz simplification) ──

/**
 * Estimate Litz spin drift in mm at a given time of flight.
 * SG = stability factor (Miller). Returns 0 when twist or geometry are missing.
 */
function spinDriftMm(
  velocity: number,
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

// ── Zero-angle solver ──

function findZeroAngle(
  muzzleVelocity: number,
  bc: number,
  sightHeightM: number,
  zeroRange: number,
  atmoFactor: number,
  model: DragModel,
  customTable: DragTablePoint[] | undefined,
): number {
  // Wider bounds to accommodate slow projectiles, long zero ranges and high
  // air density. -3° (down) to +15° (up) covers every realistic PCP setup
  // including BB guns zeroed at 50 m and slugs zeroed at 100 m.
  let low = -0.05;
  let high = 0.26;
  const dt = 0.0005;
  for (let i = 0; i < 80; i++) {
    const mid = (low + high) / 2;
    const y = simulateToRange(muzzleVelocity, bc, mid, sightHeightM, zeroRange, atmoFactor, dt, model, customTable);
    if (Math.abs(y) < 0.00001) break;
    if (y > 0) high = mid;
    else low = mid;
  }
  return (low + high) / 2;
}

function simulateToRange(
  muzzleVelocity: number,
  bc: number,
  angle: number,
  sightHeightM: number,
  targetRange: number,
  atmoFactor: number,
  dt: number,
  model: DragModel,
  customTable: DragTablePoint[] | undefined,
): number {
  let x = 0;
  let y = 0;
  let vx = muzzleVelocity * Math.cos(angle);
  let vy = muzzleVelocity * Math.sin(angle);
  while (x < targetRange) {
    const v = Math.sqrt(vx * vx + vy * vy);
    if (v < 1) break;
    const decel = dragDecel(v, bc, atmoFactor, model, customTable);
    const ax = -(decel * vx) / v;
    const ay = -GRAVITY - (decel * vy) / v;
    vx += ax * dt;
    vy += ay * dt;
    x += vx * dt;
    y += vy * dt;
  }
  const sightLineY = -sightHeightM + (sightHeightM / targetRange) * x;
  return y - sightLineY;
}

// ── Main solver ──

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

  const windAngleRad = (weather.windAngle * Math.PI) / 180;
  const crosswind = weather.windSpeed * Math.sin(windAngleRad);

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
      // `simulateToRange` (the zero solver) — otherwise drop @ zeroRange
      // will not be 0 even though the solver converged. The solver uses a
      // straight line from (-sightHeight, 0) to (0, zeroRange), so we do
      // exactly the same here. Using `tan(zeroAngle + zsa) * x` here was a
      // prior bug that produced ~58 mm of phantom drop at the zero range
      // for a 30 m zero, scaling linearly with x.
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
