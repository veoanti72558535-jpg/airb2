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
const OPEN_METEO_GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';

// ── Geocoding (city name → coordinates) ─────────────────────────────────────
export interface GeocodeResult {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  countryCode?: string;
  admin1?: string;
  /** Population for ranking — Open-Meteo returns it for major cities. */
  population?: number;
}

/**
 * Search cities by name via Open-Meteo Geocoding API (free, no key, multilingual).
 * Returns up to `count` matches sorted by Open-Meteo's relevance ranking.
 * Throws on HTTP failure — callers should catch and surface a friendly error.
 */
export async function geocodeCity(
  query: string,
  opts?: { count?: number; language?: 'fr' | 'en'; signal?: AbortSignal },
): Promise<GeocodeResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  const params = new URLSearchParams({
    name: trimmed,
    count: String(opts?.count ?? 8),
    language: opts?.language ?? 'en',
    format: 'json',
  });
  const res = await fetch(`${OPEN_METEO_GEOCODING_URL}?${params.toString()}`, {
    signal: opts?.signal,
  });
  if (!res.ok) throw new Error(`Geocoding HTTP ${res.status}`);
  const data = await res.json();
  const results = Array.isArray(data?.results) ? data.results : [];
  return results.map((r: Record<string, unknown>) => ({
    name: String(r.name ?? ''),
    latitude: Number(r.latitude),
    longitude: Number(r.longitude),
    country: typeof r.country === 'string' ? r.country : undefined,
    countryCode: typeof r.country_code === 'string' ? r.country_code : undefined,
    admin1: typeof r.admin1 === 'string' ? r.admin1 : undefined,
    population: typeof r.population === 'number' ? r.population : undefined,
  }));
}

// ── localStorage cache ──────────────────────────────────────────────────────
// Key format groups nearby coords (≈1.1 km grid via 2-decimal rounding) so
// re-opening the calculator from the same spot reuses the snapshot instead of
// hitting the network. TTL is short enough that conditions stay relevant.
const CACHE_KEY = 'pcp-weather-cache';
const CACHE_TTL_MS = 30 * 60_000; // 30 min
const CACHE_MAX_ENTRIES = 16;

interface CacheEntry {
  key: string;
  fetchedAt: number;
  result: FetchWeatherResult;
}

function coordKey(lat: number, lon: number): string {
  return `${lat.toFixed(2)},${lon.toFixed(2)}`;
}

function readCache(): CacheEntry[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as CacheEntry[]) : [];
  } catch {
    return [];
  }
}

function writeCache(entries: CacheEntry[]): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(entries.slice(-CACHE_MAX_ENTRIES)));
  } catch {
    /* quota / private mode — silently skip */
  }
}

/** Returns a cached snapshot if fresh enough, else null. Exposed for tests/UI. */
export function getCachedWeather(lat: number, lon: number): FetchWeatherResult | null {
  const key = coordKey(lat, lon);
  const hit = readCache().find(e => e.key === key);
  if (!hit) return null;
  if (Date.now() - hit.fetchedAt > CACHE_TTL_MS) return null;
  return hit.result;
}

function putCachedWeather(lat: number, lon: number, result: FetchWeatherResult): void {
  const key = coordKey(lat, lon);
  const entries = readCache().filter(e => e.key !== key);
  entries.push({ key, fetchedAt: Date.now(), result });
  writeCache(entries);
}

export function clearWeatherCache(): void {
  try { localStorage.removeItem(CACHE_KEY); } catch { /* noop */ }
}

/**
 * Hit Open-Meteo for current conditions at a coordinate.
 * Returns a fully populated WeatherSnapshot tagged as `auto`.
 * Throws on network/HTTP failure — callers should handle it.
 */
export async function fetchOpenMeteo(
  point: GeoPoint,
  options?: { force?: boolean; locationLabel?: string },
): Promise<FetchWeatherResult> {
  // Cache short-circuit: avoid refetch when the user re-opens the calculator
  // shortly after the last lookup. Caller can pass `force: true` to bypass
  // (e.g. an explicit "Refresh" button).
  if (!options?.force) {
    const cached = getCachedWeather(point.latitude, point.longitude);
    if (cached) return cached;
  }

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

  const result: FetchWeatherResult = { snapshot, label: snapshot.location! };
  putCachedWeather(point.latitude, point.longitude, result);
  return result;
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
