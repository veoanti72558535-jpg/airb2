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
 * Returns a copy of `s` with every legacy-prone field filled with safe
 * defaults.
 *
 * P3.1 contract for legacy v0 sessions (no engineVersion / profileId /
 * cdProvenance / dragLawEffective / calculatedAt / engineMetadata):
 *
 *  - These fields are READ-ONLY filled here for consumer convenience
 *    (badges, Compare warnings, exports).
 *  - The function NEVER writes back to storage. The original row in
 *    localStorage stays untouched — this is the "non-migration assumed"
 *    rule from the P3 plan.
 *  - A pre-P1 session is recognisable by `engineVersion === undefined` on
 *    the raw row. Once normalised, it carries `profileId: 'legacy'` plus
 *    `cdProvenance: 'legacy-piecewise'` so the UI can surface a "Legacy v0"
 *    badge that is distinct from the modern "Legacy" badge (engineVersion
 *    present).
 */
export function normalizeSession(s: Session): Session {
  const isLegacyV0 = s.engineVersion === undefined;
  return {
    ...s,
    tags: Array.isArray(s.tags) ? s.tags : [],
    favorite: !!s.favorite,
    input: normalizeInput(s.input),
    results: normalizeResults(s.results),
    // Read-time fillers — never written back to storage.
    profileId: s.profileId ?? 'legacy',
    dragLawEffective: s.dragLawEffective ?? s.input?.dragModel ?? 'G1',
    cdProvenance: s.cdProvenance ?? 'legacy-piecewise',
    // engineVersion stays undefined for legacy v0 — UI marker.
    engineVersion: s.engineVersion,
    // calculatedAt falls back to updatedAt for legacy v0 only, so the badge
    // tooltip has a date to show. Never overwrite a real one.
    calculatedAt: s.calculatedAt ?? (isLegacyV0 ? s.updatedAt : undefined),
  };
}

/** Convenience: normalize-or-undefined for callers that may pass `undefined`. */
export function normalizeSessionOpt(s: Session | undefined): Session | undefined {
  return s ? normalizeSession(s) : undefined;
}
