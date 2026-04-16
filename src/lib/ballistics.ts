/**
 * Deterministic ballistic engine for PCP airguns.
 * Uses simplified G1 drag model with atmospheric corrections.
 * NO AI involved — pure physics calculations.
 */

import { BallisticInput, BallisticResult, WeatherSnapshot } from './types';

// Constants
const GRAVITY = 9.80665; // m/s²
const STANDARD_TEMP = 15; // °C (ICAO standard)
const STANDARD_PRESSURE = 1013.25; // hPa
const STANDARD_HUMIDITY = 0; // %
const STANDARD_ALTITUDE = 0; // m
const GRAINS_TO_KG = 0.00006479891;

/**
 * Calculate air density based on atmospheric conditions.
 * Uses the ICAO standard atmosphere model.
 */
function calcAirDensity(weather: WeatherSnapshot): number {
  const tempK = weather.temperature + 273.15;
  const stdTempK = STANDARD_TEMP + 273.15;

  // Saturation vapor pressure (Magnus formula)
  const es = 6.1078 * Math.pow(10, (7.5 * weather.temperature) / (237.3 + weather.temperature));
  const pv = (weather.humidity / 100) * es; // Partial pressure of water vapor in hPa
  const pd = weather.pressure - pv; // Partial pressure of dry air

  // Air density using ideal gas law for moist air
  const Rd = 287.058; // J/(kg·K) specific gas constant for dry air
  const Rv = 461.495; // J/(kg·K) specific gas constant for water vapor
  const rho = (pd * 100) / (Rd * tempK) + (pv * 100) / (Rv * tempK);

  return rho;
}

/**
 * Calculate atmospheric correction factor relative to standard conditions.
 */
function calcAtmosphericFactor(weather: WeatherSnapshot): number {
  const rhoActual = calcAirDensity(weather);
  const stdWeather: WeatherSnapshot = {
    temperature: STANDARD_TEMP,
    humidity: STANDARD_HUMIDITY,
    pressure: STANDARD_PRESSURE,
    altitude: STANDARD_ALTITUDE,
    windSpeed: 0,
    windAngle: 0,
    source: 'manual',
    timestamp: '',
  };
  const rhoStd = calcAirDensity(stdWeather);
  return rhoActual / rhoStd;
}

/**
 * G1 drag deceleration factor.
 * Simplified model suitable for subsonic PCP airgun pellets.
 */
function g1DragCoefficient(velocity: number, bc: number, atmoFactor: number): number {
  // Retardation coefficient: deceleration per unit distance
  // Using simplified G1 model
  const mach = velocity / 343; // approximate speed of sound at sea level

  let cd: number;
  if (mach < 0.7) {
    cd = 0.235; // subsonic region (most PCP airguns)
  } else if (mach < 0.9) {
    cd = 0.235 + (mach - 0.7) * 1.5; // transonic ramp
  } else if (mach < 1.1) {
    cd = 0.535 + (mach - 0.9) * 2.0; // transonic peak
  } else {
    cd = 0.935 - (mach - 1.1) * 0.3; // supersonic (unlikely for PCP)
  }

  // Apply atmospheric correction and BC
  return (cd * atmoFactor) / bc;
}

/**
 * Main ballistic solver using numerical integration (Euler method).
 * Computes trajectory from muzzle to maxRange.
 */
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
  } = input;

  const atmoFactor = calcAtmosphericFactor(weather);
  const massKg = projectileWeight * GRAINS_TO_KG;
  const sightHeightM = sightHeight / 1000; // mm -> m

  // Wind components (crosswind and headwind)
  const windAngleRad = (weather.windAngle * Math.PI) / 180;
  const crosswind = weather.windSpeed * Math.sin(windAngleRad); // m/s
  const headwind = weather.windSpeed * Math.cos(windAngleRad); // m/s

  // First pass: find the angle needed to zero at zeroRange
  const zeroAngle = findZeroAngle(
    muzzleVelocity,
    bc,
    sightHeightM,
    zeroRange,
    atmoFactor,
    headwind
  );

  // Second pass: compute full trajectory
  const results: BallisticResult[] = [];
  const dt = 0.0005; // time step in seconds (0.5ms for precision)

  let x = 0; // horizontal distance (m)
  let y = 0; // vertical position relative to bore axis (m)
  let vx = muzzleVelocity * Math.cos(zeroAngle);
  let vy = muzzleVelocity * Math.sin(zeroAngle);
  let t = 0;
  let windDriftX = 0; // lateral drift due to crosswind (m)

  let nextRange = rangeStep;

  // Add result at muzzle (range = 0)
  results.push({
    range: 0,
    drop: -sightHeightM * 1000,
    holdover: 0,
    holdoverMRAD: 0,
    velocity: muzzleVelocity,
    energy: 0.5 * massKg * muzzleVelocity * muzzleVelocity,
    tof: 0,
    windDrift: 0,
    windDriftMOA: 0,
    windDriftMRAD: 0,
    clicksElevation: 0,
    clicksWindage: 0,
  });

  while (x < maxRange + 1) {
    const v = Math.sqrt(vx * vx + vy * vy);
    if (v < 1) break; // pellet has stopped

    // Drag
    const dragFactor = g1DragCoefficient(v, bc, atmoFactor);
    // Deceleration magnitude
    const dragDecel = dragFactor * v * v / (bc * 100); // simplified

    // More accurate drag using retardation
    const ax = -(dragDecel * vx) / v - (headwind > 0 ? headwind * 0.001 : 0);
    const ay = -GRAVITY - (dragDecel * vy) / v;

    // Wind drift acceleration (simplified lag model)
    const windDriftAccel = crosswind * dragDecel / v * 0.01;

    vx += ax * dt;
    vy += ay * dt;
    x += vx * dt;
    y += vy * dt;
    t += dt;
    windDriftX += windDriftAccel * dt * vx * dt;

    if (x >= nextRange && nextRange <= maxRange) {
      // Position relative to sight line
      const sightLineY = -sightHeightM + (sightHeightM * x) / 1; // bore to sight offset
      const dropFromSightLine = (y - (-sightHeightM)) * 1000; // mm, relative to line of sight

      // Drop relative to zero point sight line
      const zeroSightAngle = Math.atan2(sightHeightM, zeroRange);
      const sightLineAtRange = -sightHeightM + Math.tan(zeroAngle + zeroSightAngle) * x;
      const dropMm = (y - sightLineAtRange) * 1000;

      // Holdover conversions
      const holdoverMOA = x > 0 ? Math.atan2(-dropMm / 1000, x) * (180 / Math.PI) * 60 : 0;
      const holdoverMRAD = x > 0 ? (-dropMm / 1000 / x) * 1000 : 0;

      const currentV = Math.sqrt(vx * vx + vy * vy);
      const energyJ = 0.5 * massKg * currentV * currentV;

      const windDriftMm = windDriftX * 1000;
      const wdMOA = x > 0 ? Math.atan2(windDriftX, x) * (180 / Math.PI) * 60 : 0;
      const wdMRAD = x > 0 ? (windDriftX / x) * 1000 : 0;

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
        velocity: Math.round(currentV * 10) / 10,
        energy: Math.round(energyJ * 100) / 100,
        tof: Math.round(t * 1000) / 1000,
        windDrift: Math.round(windDriftMm * 10) / 10,
        windDriftMOA: Math.round(wdMOA * 100) / 100,
        windDriftMRAD: Math.round(wdMRAD * 100) / 100,
        clicksElevation: clicksElev,
        clicksWindage: clicksWind,
      });

      nextRange += rangeStep;
    }
  }

  return results;
}

/**
 * Binary search for the bore angle that produces zero drop at zeroRange.
 */
function findZeroAngle(
  muzzleVelocity: number,
  bc: number,
  sightHeightM: number,
  zeroRange: number,
  atmoFactor: number,
  headwind: number
): number {
  let low = -0.01; // radians
  let high = 0.05;
  const dt = 0.0005;

  for (let iter = 0; iter < 50; iter++) {
    const mid = (low + high) / 2;
    const yAtZero = simulateToRange(muzzleVelocity, bc, mid, sightHeightM, zeroRange, atmoFactor, headwind, dt);

    if (Math.abs(yAtZero) < 0.00001) break; // close enough (0.01mm)
    if (yAtZero > 0) {
      high = mid;
    } else {
      low = mid;
    }
  }

  return (low + high) / 2;
}

/**
 * Simulate projectile to a given range and return y position relative to sight line.
 */
function simulateToRange(
  muzzleVelocity: number,
  bc: number,
  angle: number,
  sightHeightM: number,
  targetRange: number,
  atmoFactor: number,
  headwind: number,
  dt: number
): number {
  let x = 0;
  let y = 0;
  let vx = muzzleVelocity * Math.cos(angle);
  let vy = muzzleVelocity * Math.sin(angle);

  while (x < targetRange) {
    const v = Math.sqrt(vx * vx + vy * vy);
    if (v < 1) break;

    const dragFactor = g1DragCoefficient(v, bc, atmoFactor);
    const dragDecel = dragFactor * v * v / (bc * 100);

    const ax = -(dragDecel * vx) / v;
    const ay = -GRAVITY - (dragDecel * vy) / v;

    vx += ax * dt;
    vy += ay * dt;
    x += vx * dt;
    y += vy * dt;
  }

  // y relative to sight line at this range
  const sightLineY = -sightHeightM + (sightHeightM / targetRange) * x;
  return y - sightLineY;
}
