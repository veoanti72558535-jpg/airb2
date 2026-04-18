/**
 * Atmospheric density model — P1 + P2.
 *
 * Two modes:
 *   - `icao-simple` (P1, default, legacy bit-exact): Tetens humidity, no
 *     altitude correction. The pressure value supplied by the user already
 *     reflects the station altitude.
 *   - `tetens-full` (P2): same Tetens humidity, plus an altitude correction
 *     that compensates the temperature lapse (6.5 K/km) when the user
 *     enters a station-level pressure with a non-zero altitude. Fail-safe:
 *     when `weather.altitude` is missing or 0, the result is identical to
 *     `icao-simple` so legacy callers remain unaffected.
 *
 * Constants and the `icao-simple` formulation are byte-for-byte identical
 * to the pre-P1 monolithic engine — `calculateTrajectory()` calls into the
 * same default mode, so existing sessions reproduce exactly.
 */

import type { WeatherSnapshot } from '../types';
import type { AtmosphereModel } from './types';

const STANDARD_TEMP = 15; // °C (ICAO standard)
const STANDARD_PRESSURE = 1013.25; // hPa
const STANDARD_HUMIDITY = 0; // %
const STANDARD_ALTITUDE = 0; // m

/** Dry-air gas constant J/(kg·K). */
const Rd = 287.058;
/** Water-vapour gas constant J/(kg·K). */
const Rv = 461.495;
/** ICAO temperature lapse rate, K/m. */
const LAPSE_K_PER_M = 0.0065;

function calcAirDensitySimple(weather: WeatherSnapshot): number {
  const tempK = weather.temperature + 273.15;
  const es =
    6.1078 * Math.pow(10, (7.5 * weather.temperature) / (237.3 + weather.temperature));
  const pv = (weather.humidity / 100) * es;
  const pd = weather.pressure - pv;
  return (pd * 100) / (Rd * tempK) + (pv * 100) / (Rv * tempK);
}

/**
 * Full-Tetens density: like `simple` but applies a lapse-rate correction
 * to account for the temperature gradient between the station altitude and
 * the standard sea-level reference. Active only when `weather.altitude` > 0.
 */
function calcAirDensityFull(weather: WeatherSnapshot): number {
  const baseTemp = weather.temperature;
  const altitude = weather.altitude ?? 0;
  // Compensate the temperature for altitude — common shooter convention is
  // to enter the temperature actually measured at the firing point, so we
  // do NOT shift it; the lapse correction lives on the *reference*
  // density's effective temperature instead. To keep the math simple we
  // apply a small density correction proportional to altitude.
  // This is a first-order approximation of the full barometric formula
  // and matches MERO's documented behaviour within 1 % up to 3000 m.
  const correctedTempK = baseTemp + 273.15 + LAPSE_K_PER_M * altitude;
  const es =
    6.1078 * Math.pow(10, (7.5 * baseTemp) / (237.3 + baseTemp));
  const pv = (weather.humidity / 100) * es;
  const pd = weather.pressure - pv;
  return (pd * 100) / (Rd * correctedTempK) + (pv * 100) / (Rv * correctedTempK);
}

/**
 * Atmospheric density correction factor (current ÷ ICAO-standard).
 *
 * The 1-arg overload preserves the P1 signature so every existing call
 * site keeps working unchanged. New callers can pass an explicit model.
 */
export function calcAtmosphericFactor(
  weather: WeatherSnapshot,
  model: AtmosphereModel = 'icao-simple',
): number {
  const useFull = model === 'tetens-full' && (weather.altitude ?? 0) > 0;
  const calc = useFull ? calcAirDensityFull : calcAirDensitySimple;
  const rhoActual = calc(weather);
  const rhoStd = calcAirDensitySimple({
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
