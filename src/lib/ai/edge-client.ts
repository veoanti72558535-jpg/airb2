/**
 * Client frontend générique pour le dispatcher IA (`ai-provider-dispatch`).
 *
 * BUILD-IA2e — Aucun secret côté client. Le client envoie la requête
 * au dispatcher via `supabase.functions.invoke`, qui gère auth, routing,
 * quota, fallback, et logging.
 *
 * Ce module NE touche PAS à `ai-extract-rows` (IA-1).
 */
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface AIDispatchRequest {
  agent_slug: string;
  prompt: string;
  system_prompt?: string;
  output_schema?: unknown;
  image_base64?: string;
  image_mime?: string;
  max_tokens?: number;
  temperature?: number;
  provider_override?: string;
  model_override?: string;
}

export interface AIDispatchResponse {
  text: string;
  provider: string;
  model: string;
  latency_ms: number;
  run_id: string;
}

export interface AIDispatchError {
  error: string;
  code?: string;
}

export type AIDispatchResult =
  | { ok: true; data: AIDispatchResponse }
  | { ok: false; error: string; code?: string };

/* ------------------------------------------------------------------ */
/*  Public API                                                        */
/* ------------------------------------------------------------------ */

/**
 * Appelle le dispatcher IA via l'Edge Function `ai-provider-dispatch`.
 *
 * Retourne un discriminated union `{ ok, data } | { ok, error }` pour
 * une gestion d'erreur explicite côté appelant.
 */
export async function queryAIViaEdge(
  request: AIDispatchRequest,
): Promise<AIDispatchResult> {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, error: 'Supabase not configured', code: 'NO_SUPABASE' };
  }

  try {
    const { data, error } = await supabase.functions.invoke(
      'ai-provider-dispatch',
      { body: request },
    );

    if (error) {
      return {
        ok: false,
        error: error.message ?? 'Edge function invocation failed',
        code: 'EDGE_ERROR',
      };
    }

    // The dispatcher returns `{ error }` on business errors
    if (data?.error) {
      return {
        ok: false,
        error: data.error as string,
        code: (data.code as string) ?? 'DISPATCH_ERROR',
      };
    }

    return {
      ok: true,
      data: {
        text: data.text as string,
        provider: data.provider as string,
        model: data.model as string,
        latency_ms: data.latency_ms as number,
        run_id: data.run_id as string,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg, code: 'UNEXPECTED' };
  }
}