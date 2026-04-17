/**
 * Legacy session normalisation.
 *
 * Sessions saved by older builds may lack fields that newer code paths
 * (compare view, advanced ballistic table, weather summary) consume. Rather
 * than scatter `?? defaultX` fallbacks across every consumer — and risk a
 * silent crash the day someone forgets one — we funnel every read through
 * `normalizeSession()`.
 *
 * Contract:
 *  - Pure: never mutates the input session.
 *  - Idempotent: running it twice produces the same shape.
 *  - Conservative: fills only what is unambiguously safe (drag model defaults
 *    to G1, weather defaults to ICAO standard, tags default to []). It NEVER
 *    invents physics values like muzzleVelocity or bc.
 *  - Returns the same shape as `Session` so call sites stay typed.
 */

import { BallisticInput, BallisticResult, Session, WeatherSnapshot } from './types';

/** ICAO standard atmosphere — used as the safe default for missing weather. */
export function defaultWeatherSnapshot(): WeatherSnapshot {
  return {
    temperature: 15,
    humidity: 0,
    pressure: 1013.25,
    altitude: 0,
    windSpeed: 0,
    windAngle: 0,
    source: 'manual',
    timestamp: '',
  };
}

function normalizeWeather(w: WeatherSnapshot | undefined): WeatherSnapshot {
  if (!w) return defaultWeatherSnapshot();
  // A partial weather (older sessions stored only T/P/H) — fill missing keys
  // with the standard atmosphere so the engine and the UI both have a number.
  const std = defaultWeatherSnapshot();
  return {
    temperature: w.temperature ?? std.temperature,
    humidity: w.humidity ?? std.humidity,
    pressure: w.pressure ?? std.pressure,
    altitude: w.altitude ?? std.altitude,
    windSpeed: w.windSpeed ?? std.windSpeed,
    windAngle: w.windAngle ?? std.windAngle,
    source: w.source ?? 'manual',
    timestamp: w.timestamp ?? '',
    location: w.location,
    provider: w.provider,
    latitude: w.latitude,
    longitude: w.longitude,
    manualOverrides: w.manualOverrides,
  };
}

function normalizeInput(i: BallisticInput): BallisticInput {
  return {
    ...i,
    dragModel: i.dragModel ?? 'G1',
    focalPlane: i.focalPlane ?? 'FFP',
    rangeStep: i.rangeStep && i.rangeStep > 0 ? i.rangeStep : 10,
    maxRange: i.maxRange && i.maxRange > 0 ? i.maxRange : 50,
    weather: normalizeWeather(i.weather),
    zeroWeather: i.zeroWeather ? normalizeWeather(i.zeroWeather) : undefined,
  };
}

function normalizeResults(rows: BallisticResult[] | undefined): BallisticResult[] {
  return Array.isArray(rows) ? rows : [];
}

/**
 * Returns a copy of `s` with every legacy-prone field filled with safe defaults.
 * Use this at the boundary of any view that consumes a stored Session.
 */
export function normalizeSession(s: Session): Session {
  return {
    ...s,
    tags: Array.isArray(s.tags) ? s.tags : [],
    favorite: !!s.favorite,
    input: normalizeInput(s.input),
    results: normalizeResults(s.results),
  };
}

/** Convenience: normalize-or-undefined for callers that may pass `undefined`. */
export function normalizeSessionOpt(s: Session | undefined): Session | undefined {
  return s ? normalizeSession(s) : undefined;
}
