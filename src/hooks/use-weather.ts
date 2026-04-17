/**
 * Weather state machine for the calculator.
 * - Tracks per-field manual overrides on top of an auto fetch
 * - Exposes idempotent helpers to fetch / locate / patch the snapshot
 * - Never blocks the calculator on network failure
 */

import { useCallback, useState } from 'react';
import { WeatherFieldKey, WeatherSnapshot, WeatherSource } from '@/lib/types';
import { fetchWeather, getCurrentPosition } from '@/lib/weather';

export type WeatherStatus = 'idle' | 'locating' | 'loading' | 'error';

export interface UseWeatherApi {
  status: WeatherStatus;
  error: string | null;
  /** True when the current snapshot was served from the local cache. */
  fromCache: boolean;
  /** Fetch by browser geolocation. Resolves silently on failure. */
  fetchByLocation: () => Promise<void>;
  /** Fetch using explicit coordinates. Pass `force` to bypass the local cache. */
  fetchByCoords: (lat: number, lon: number, opts?: { force?: boolean; locationLabel?: string }) => Promise<void>;
  /** Patch one or more fields manually; tagged as overrides over an auto base. */
  patchManual: (patch: Partial<WeatherSnapshot>) => void;
  /** Reset everything to a manual snapshot using the given values. */
  reset: (next: WeatherSnapshot) => void;
  /** Compute `auto | manual | mixed` from current overrides. */
  effectiveSource: (snap: WeatherSnapshot) => WeatherSource;
}

const FIELD_KEYS: WeatherFieldKey[] = [
  'temperature',
  'humidity',
  'pressure',
  'altitude',
  'windSpeed',
  'windAngle',
];

function computeSource(snap: WeatherSnapshot): WeatherSource {
  if (snap.source === 'manual' && (!snap.manualOverrides || snap.manualOverrides.length === 0))
    return 'manual';
  // If we never had an auto base, treat as manual regardless of overrides.
  if (!snap.provider) return 'manual';
  const overrides = snap.manualOverrides ?? [];
  if (overrides.length === 0) return 'auto';
  if (overrides.length >= FIELD_KEYS.length) return 'manual';
  return 'mixed';
}

export function useWeather(
  current: WeatherSnapshot,
  setWeather: (next: WeatherSnapshot) => void,
): UseWeatherApi {
  const [status, setStatus] = useState<WeatherStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  // True when the LAST successful fetch was served from the cache. Reset by
  // any forced refetch (`{ force: true }`) so the UI badge stays in sync.
  const [fromCache, setFromCache] = useState<boolean>(false);

  const fetchByCoords = useCallback(
    async (lat: number, lon: number, opts?: { force?: boolean; locationLabel?: string }) => {
      setStatus('loading');
      setError(null);
      try {
        const result = await fetchWeather({ latitude: lat, longitude: lon }, opts);
        setWeather(result.snapshot);
        setFromCache(Boolean(result.fromCache));
        setStatus('idle');
      } catch (e) {
        setStatus('error');
        setError(e instanceof Error ? e.message : 'unknown');
      }
    },
    [setWeather],
  );

  const fetchByLocation = useCallback(async () => {
    setStatus('locating');
    setError(null);
    try {
      const point = await getCurrentPosition();
      await fetchByCoords(point.latitude, point.longitude);
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : 'unknown');
    }
  }, [fetchByCoords]);

  const patchManual = useCallback(
    (patch: Partial<WeatherSnapshot>) => {
      const overrides = new Set<WeatherFieldKey>(current.manualOverrides ?? []);
      // Track only fields that actually changed value.
      for (const k of FIELD_KEYS) {
        if (patch[k] !== undefined && patch[k] !== current[k]) overrides.add(k);
      }
      const next: WeatherSnapshot = {
        ...current,
        ...patch,
        manualOverrides: Array.from(overrides),
        timestamp: new Date().toISOString(),
      };
      next.source = computeSource(next);
      setWeather(next);
    },
    [current, setWeather],
  );

  const reset = useCallback(
    (next: WeatherSnapshot) => {
      setWeather({ ...next, manualOverrides: [], source: 'manual' });
      setStatus('idle');
      setError(null);
    },
    [setWeather],
  );

  return {
    status,
    error,
    fetchByLocation,
    fetchByCoords,
    patchManual,
    reset,
    effectiveSource: computeSource,
  };
}
