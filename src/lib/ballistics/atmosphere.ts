/**
 * Atmospheric density model — P1 extraction.
 *
 * Currently implements the same Tetens/ideal-gas formulation used by the
 * legacy monolithic engine. P2 will introduce a fuller Tetens + altitude
 * lapse model under the `tetens-full` atmosphere mode.
 *
 * Constants and behaviour are byte-for-byte identical to the previous
 * `ballistics.ts` so existing sessions reproduce exactly.
 */

import type { WeatherSnapshot } from '../types';

const STANDARD_TEMP = 15; // °C (ICAO standard)
const STANDARD_PRESSURE = 1013.25; // hPa
const STANDARD_HUMIDITY = 0; // %
const STANDARD_ALTITUDE = 0; // m

/** Dry-air gas constant J/(kg·K). */
const Rd = 287.058;
/** Water-vapour gas constant J/(kg·K). */
const Rv = 461.495;

function calcAirDensity(weather: WeatherSnapshot): number {
  const tempK = weather.temperature + 273.15;
  // Tetens equation for saturation vapour pressure (hPa).
  const es =
    6.1078 * Math.pow(10, (7.5 * weather.temperature) / (237.3 + weather.temperature));
  const pv = (weather.humidity / 100) * es;
  const pd = weather.pressure - pv;
  return (pd * 100) / (Rd * tempK) + (pv * 100) / (Rv * tempK);
}

/**
 * Atmospheric density correction factor (current ÷ ICAO-standard).
 * Exposed so calibration / tooling can reuse the exact same atmosphere
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
