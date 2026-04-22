/**
 * Quatarly models cache with 24h TTL in localStorage.
 *
 * Fetches available models from `ai-providers-test` edge function,
 * caches in localStorage to avoid repeated calls.
 * If the API fails, returns stale cache or empty array — never throws.
 */
import { supabase } from '@/integrations/supabase/client';

const CACHE_KEY = 'quatarly_models_cache';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

interface ModelsCache {
  models: string[];
  fetchedAt: number;
}

function readCache(): ModelsCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ModelsCache;
  } catch {
    return null;
  }
}

function writeCache(models: string[]): void {
  const entry: ModelsCache = { models, fetchedAt: Date.now() };
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // quota exceeded — ignore
  }
}

/** True if cache exists and is less than 24h old. */
export function isCacheFresh(): boolean {
  const cache = readCache();
  if (!cache) return false;
  return Date.now() - cache.fetchedAt < CACHE_TTL_MS;
}

/** Returns the cache timestamp (ms) or null. */
export function getCacheFetchedAt(): number | null {
  return readCache()?.fetchedAt ?? null;
}

/** Fetch models from edge function. Returns [] on failure. */
async function fetchModelsFromApi(): Promise<string[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.functions.invoke('ai-providers-test', { body: {} });
    if (error || !data) return [];
    const models = (data as { quatarly?: { models?: string[] } })?.quatarly?.models;
    // Also check top-level quatarlyModels field
    const alt = (data as { quatarlyModels?: string[] })?.quatarlyModels;
    return Array.isArray(models) ? models : Array.isArray(alt) ? alt : [];
  } catch {
    return [];
  }
}

/**
 * Get Quatarly models. Uses cache if fresh (<24h), otherwise fetches.
 * On API failure, returns stale cache if available, else [].
 */
export async function getQuatarlyModels(): Promise<string[]> {
  const cache = readCache();
  if (cache && isCacheFresh()) return cache.models;

  const fresh = await fetchModelsFromApi();
  if (fresh.length > 0) {
    writeCache(fresh);
    return fresh;
  }

  // API failed — return stale cache if any
  return cache?.models ?? [];
}

/**
 * Force refresh — ignores cache TTL.
 * Returns fresh models or stale cache on failure.
 */
export async function refreshQuatarlyModels(): Promise<string[]> {
  const fresh = await fetchModelsFromApi();
  if (fresh.length > 0) {
    writeCache(fresh);
    return fresh;
  }
  return readCache()?.models ?? [];
}