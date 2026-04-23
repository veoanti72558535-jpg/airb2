/**
 * Cache wrapper around `queryAIViaEdge()`.
 *
 * RULES :
 * - This file IMPORTS edge-client.ts but NEVER modifies it.
 * - Cache is read/written on Supabase table `ai_responses_cache`.
 * - Cache key = FNV-1a hash of agent_slug + prompt + image_base64 (if any).
 * - Cache failures are silent → fallback to direct queryAIViaEdge call.
 * - No automatic TTL — caller controls via `forceRefresh: true`.
 */
import { queryAIViaEdge, type AIDispatchRequest } from './edge-client';
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';

/* ------------------------------------------------------------------ */
/*  Hash                                                              */
/* ------------------------------------------------------------------ */

/**
 * FNV-1a 32-bit hash. Fast, deterministic, collision-resistant enough
 * for prompt caching keys.
 */
export function hashPrompt(str: string): string {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h.toString(16);
}

/**
 * Build the cache key from request parts. Includes image hash separately
 * so two requests with same prompt but different images don't collide.
 */
export function buildCacheKey(
  agentSlug: string,
  prompt: string,
  imageBase64?: string,
): string {
  const promptHash = hashPrompt(`${agentSlug}::${prompt}`);
  if (!imageBase64) return promptHash;
  const imgHash = hashPrompt(imageBase64);
  return `${promptHash}_${imgHash}`;
}

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface CachedAIRequest extends AIDispatchRequest {
  /** If true, ignore the cache and force a new call. Default: false. */
  forceRefresh?: boolean;
  /** If true, do not store the response in cache. Default: false. */
  noCache?: boolean;
}

export interface CachedAIResult {
  text: string;
  provider: string;
  model: string;
  run_id: string;
  fromCache: boolean;
  cachedAt?: string;
}

export type CachedAIResponse =
  | { ok: true; data: CachedAIResult }
  | { ok: false; error: string; code?: string };

/* ------------------------------------------------------------------ */
/*  Read                                                              */
/* ------------------------------------------------------------------ */

/**
 * Read a cached response for a given agent + prompt hash.
 * Returns null if not present or on any error (silent fallback).
 */
export async function getCachedResponse(
  agentSlug: string,
  promptHash: string,
  userId: string,
): Promise<CachedAIResult | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from('ai_responses_cache')
      .select('response_text, provider, model, run_id, created_at')
      .eq('user_id', userId)
      .eq('agent_slug', agentSlug)
      .eq('input_hash', promptHash)
      .maybeSingle();

    if (error || !data) return null;

    return {
      text: data.response_text as string,
      provider: (data.provider as string) ?? 'unknown',
      model: (data.model as string) ?? 'unknown',
      run_id: (data.run_id as string) ?? '',
      fromCache: true,
      cachedAt: data.created_at as string,
    };
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Write                                                             */
/* ------------------------------------------------------------------ */

async function writeCache(
  agentSlug: string,
  promptHash: string,
  userId: string,
  response: { text: string; provider: string; model: string; run_id: string },
): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  try {
    await supabase
      .from('ai_responses_cache')
      .upsert(
        {
          user_id: userId,
          agent_slug: agentSlug,
          input_hash: promptHash,
          response_text: response.text,
          provider: response.provider,
          model: response.model,
          run_id: response.run_id,
        },
        { onConflict: 'user_id,agent_slug,input_hash' },
      );
  } catch {
    // silent — cache write failures must never break the AI call
  }
}

/* ------------------------------------------------------------------ */
/*  Invalidate                                                        */
/* ------------------------------------------------------------------ */

/**
 * Invalidate cache for a given agent + user.
 * If promptHash is provided, only that entry is deleted; otherwise all
 * cached responses for the agent are removed.
 */
export async function invalidateCache(
  agentSlug: string,
  userId: string,
  promptHash?: string,
): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  try {
    let q = supabase
      .from('ai_responses_cache')
      .delete()
      .eq('user_id', userId)
      .eq('agent_slug', agentSlug);
    if (promptHash) q = q.eq('input_hash', promptHash);
    await q;
  } catch {
    // silent
  }
}

/* ------------------------------------------------------------------ */
/*  List                                                              */
/* ------------------------------------------------------------------ */

/**
 * List all cached responses for an agent and user.
 * Useful for an "AI history" panel.
 */
export async function listCachedResponses(
  agentSlug: string,
  userId: string,
): Promise<CachedAIResult[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  try {
    const { data, error } = await supabase
      .from('ai_responses_cache')
      .select('response_text, provider, model, run_id, created_at')
      .eq('user_id', userId)
      .eq('agent_slug', agentSlug)
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map((d: any) => ({
      text: d.response_text as string,
      provider: (d.provider as string) ?? 'unknown',
      model: (d.model as string) ?? 'unknown',
      run_id: (d.run_id as string) ?? '',
      fromCache: true,
      cachedAt: d.created_at as string,
    }));
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ */
/*  Main entry — read-through cache                                   */
/* ------------------------------------------------------------------ */

/**
 * Call the AI dispatcher with read-through cache on Supabase.
 *
 * Order:
 *  1. If `forceRefresh=false` and a cached entry exists → return it.
 *  2. Otherwise call `queryAIViaEdge()`.
 *  3. On success and `noCache=false` → store in cache.
 *  4. Return the result.
 *
 * Any cache error is silent: the call falls back to a direct edge call.
 */
export async function queryAIWithCache(
  request: CachedAIRequest,
  userId: string,
): Promise<CachedAIResponse> {
  const { forceRefresh = false, noCache = false, ...edgeRequest } = request;
  const cacheKey = buildCacheKey(
    edgeRequest.agent_slug,
    edgeRequest.prompt,
    edgeRequest.image_base64,
  );

  // 1. Try cache (unless forceRefresh)
  if (!forceRefresh && userId) {
    const cached = await getCachedResponse(edgeRequest.agent_slug, cacheKey, userId);
    if (cached) {
      return { ok: true, data: cached };
    }
  }

  // 2. Live call
  const result = await queryAIViaEdge(edgeRequest);
  if (result.ok !== true) {
    return { ok: false, error: result.error, code: result.code };
  }

  // 3. Write cache (best-effort)
  if (!noCache && userId) {
    await writeCache(edgeRequest.agent_slug, cacheKey, userId, {
      text: result.data.text,
      provider: result.data.provider,
      model: result.data.model,
      run_id: result.data.run_id,
    });
  }

  // 4. Return
  return {
    ok: true,
    data: {
      text: result.data.text,
      provider: result.data.provider,
      model: result.data.model,
      run_id: result.data.run_id,
      fromCache: false,
    },
  };
}
