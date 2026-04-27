/**
 * F3 — Ballistic calculation memoization cache.
 * Caches trajectory results by input hash to avoid redundant calculations.
 * LRU eviction with max 50 entries.
 */
import type { BallisticInput, BallisticResult } from '@/lib/types';

const MAX_CACHE = 50;

/** Simple hash of ballistic input for cache keying. */
function hashInput(input: BallisticInput): string {
  const key = [
    input.muzzleVelocity,
    input.bc,
    input.projectileWeight,
    input.sightHeight,
    input.zeroRange,
    input.maxRange,
    input.rangeStep,
    input.dragModel ?? 'G1',
    input.weather.temperature,
    input.weather.humidity,
    input.weather.pressure,
    input.weather.altitude,
    input.weather.windSpeed,
    input.weather.windAngle,
    input.clickValue ?? 0,
    input.clickUnit ?? '',
    input.twistRate ?? 0,
    input.slopeAngle ?? 0,
    input.latitude ?? 0,
    input.shootingAzimuth ?? 0,
  ].join('|');
  // Simple string hash (djb2)
  let hash = 5381;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) + hash + key.charCodeAt(i)) | 0;
  }
  return hash.toString(36);
}

interface CacheEntry {
  results: BallisticResult[];
  accessTime: number;
}

const cache = new Map<string, CacheEntry>();

/** Get cached trajectory results, or null if not cached. */
export function getCachedTrajectory(input: BallisticInput): BallisticResult[] | null {
  const key = hashInput(input);
  const entry = cache.get(key);
  if (entry) {
    entry.accessTime = Date.now();
    return entry.results;
  }
  return null;
}

/** Store trajectory results in cache. */
export function setCachedTrajectory(input: BallisticInput, results: BallisticResult[]): void {
  const key = hashInput(input);
  cache.set(key, { results, accessTime: Date.now() });

  // Evict oldest entries if cache is full
  if (cache.size > MAX_CACHE) {
    let oldestKey = '';
    let oldestTime = Infinity;
    for (const [k, v] of cache) {
      if (v.accessTime < oldestTime) {
        oldestTime = v.accessTime;
        oldestKey = k;
      }
    }
    if (oldestKey) cache.delete(oldestKey);
  }
}

/** Clear the trajectory cache. */
export function clearTrajectoryCache(): void {
  cache.clear();
}

/** Get cache stats for debugging. */
export function getCacheStats(): { size: number; maxSize: number } {
  return { size: cache.size, maxSize: MAX_CACHE };
}
