/**
 * Weather provider integration (Open-Meteo, no API key required).
 * The fetcher is provider-agnostic — `fetchWeather` only depends on
 * the contract of returning a `WeatherSnapshot`. Add new providers
 * by exporting another implementation behind the same signature.
 */

import { WeatherSnapshot } from './types';

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface FetchWeatherResult {
  snapshot: WeatherSnapshot;
  /** Human-readable label like "Lat 48.85, Lon 2.35". */
  label: string;
}

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';

/**
 * Hit Open-Meteo for current conditions at a coordinate.
 * Returns a fully populated WeatherSnapshot tagged as `auto`.
 * Throws on network/HTTP failure — callers should handle it.
 */
export async function fetchOpenMeteo(point: GeoPoint): Promise<FetchWeatherResult> {
  const params = new URLSearchParams({
    latitude: point.latitude.toFixed(4),
    longitude: point.longitude.toFixed(4),
    current: [
      'temperature_2m',
      'relative_humidity_2m',
      'pressure_msl',
      'surface_pressure',
      'wind_speed_10m',
      'wind_direction_10m',
    ].join(','),
    wind_speed_unit: 'ms',
    timezone: 'auto',
  });

  const res = await fetch(`${OPEN_METEO_URL}?${params.toString()}`);
  if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
  const data = await res.json();
  const c = data?.current;
  if (!c) throw new Error('Open-Meteo: missing current block');

  // Convert wind direction from "where it comes from" (meteorological) to our
  // "0 = headwind, 90 = wind from the right" convention. Without a shooter
  // bearing, we expose the raw meteo direction (0 = North) and let the user
  // adjust — this keeps it deterministic and unsurprising.
  const windAngle = Number.isFinite(c.wind_direction_10m) ? c.wind_direction_10m : 90;

  const snapshot: WeatherSnapshot = {
    temperature: Number(c.temperature_2m ?? 15),
    humidity: Number(c.relative_humidity_2m ?? 50),
    pressure: Number(c.pressure_msl ?? c.surface_pressure ?? 1013.25),
    altitude: Number(data?.elevation ?? 0),
    windSpeed: Number(c.wind_speed_10m ?? 0),
    windAngle,
    source: 'auto',
    timestamp: new Date().toISOString(),
    provider: 'open-meteo',
    latitude: point.latitude,
    longitude: point.longitude,
    location: `${point.latitude.toFixed(2)}, ${point.longitude.toFixed(2)}`,
    manualOverrides: [],
  };

  return { snapshot, label: snapshot.location! };
}

/** Stable alias — callers can swap providers later without touching code. */
export const fetchWeather = fetchOpenMeteo;

/**
 * Wrap navigator.geolocation in a promise.
 * Rejects with a typed error string for known failure modes so the UI can map
 * them to localized messages.
 */
export function getCurrentPosition(): Promise<GeoPoint> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('unsupported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      err => {
        if (err.code === err.PERMISSION_DENIED) reject(new Error('denied'));
        else if (err.code === err.POSITION_UNAVAILABLE) reject(new Error('unavailable'));
        else if (err.code === err.TIMEOUT) reject(new Error('timeout'));
        else reject(new Error('failed'));
      },
      { enableHighAccuracy: false, maximumAge: 5 * 60_000, timeout: 10_000 },
    );
  });
}
